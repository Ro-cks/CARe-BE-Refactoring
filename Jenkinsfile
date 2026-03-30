pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    environment {
        TARGET_BRANCH = "release"
        DOCKER_NETWORK = "care-network"

        // Backend
        BACKEND_IMAGE = "spring-boot-app:latest"

        // AI Face
        AI_VERIFY_IMAGE = "ai-verify:latest"
        AI_VERIFY_CONTAINER = "ai-verify"

        // Nginx
        NGINX_CONTAINER = "nginx"

        // Infrastructure
        MYSQL_CONTAINER = "mysql"
        REDIS_CONTAINER = "redis"

        // YOLO 서버 전체 URL (예: https://xxxx.trycloudflare.com 또는 http://localhost:8000)
        AI_YOLO_URL = "${(env.AI_YOLO_URL ?: 'http://localhost:8000').trim()}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ============================================================
        // 1. 브랜치 확인 + 변경 파일 감지
        // ============================================================
        stage('Check Branch & Changes') {
            steps {
                script {
                    // 현재 브랜치 확인
                    def branch = env.GIT_BRANCH?.replaceAll('origin/', '') ?: ''

                    if (!branch || branch == 'HEAD') {
                        branch = sh(
                            script: "git branch -r --contains HEAD | grep -o 'origin/[^[:space:]]*' | head -n 1 | sed 's|origin/||'",
                            returnStdout: true
                        ).trim()
                    }

                    echo "Current branch: ${branch}"

                    // release 브랜치가 아니면 스킵
                    if (branch != env.TARGET_BRANCH) {
                        echo "Not on '${env.TARGET_BRANCH}' branch. Skipping deployment."
                        currentBuild.result = 'NOT_BUILT'
                        error("Branch mismatch: expected '${env.TARGET_BRANCH}', got '${branch}'")
                    }

                    // 변경된 파일 목록 확인 (merge commit 포함)
                    def changes = []
                    try {
                        def result = sh(
                            script: "git diff-tree -m --no-commit-id --name-only -r HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD 2>/dev/null || echo 'backend/'",
                            returnStdout: true
                        ).trim()
                        changes = result ? result.split('\n') : ['backend/']
                    } catch (Exception e) {
                        echo "First commit or unable to get diff, proceeding with full build"
                        changes = ['backend/', 'renter/', 'company/']
                    }

                    echo "Changed files: ${changes}"

                    def jenkinsfileChanged  = changes.any { it.contains('Jenkinsfile') }
                    def backendChanged      = changes.any { it.startsWith('backend/') }
                    def renterChanged       = changes.any { it.startsWith('renter/') }
                    def companyChanged      = changes.any { it.startsWith('company/') }
                    def nginxConfChanged    = changes.any { it.startsWith('infra/nginx/') }
                    def aiFaceChanged       = changes.any { it.startsWith('ai/') }

                    // Jenkinsfile 변경 시 전체 빌드
                    env.BUILD_BACKEND  = (jenkinsfileChanged || backendChanged)  ? 'true' : 'false'
                    env.BUILD_RENTER   = (jenkinsfileChanged || renterChanged)   ? 'true' : 'false'
                    env.BUILD_COMPANY  = (jenkinsfileChanged || companyChanged)  ? 'true' : 'false'
                    env.BUILD_NGINX_CONF = (nginxConfChanged)                    ? 'true' : 'false'
                    env.BUILD_AI_VERIFY  = (jenkinsfileChanged || aiFaceChanged)   ? 'true' : 'false'

                    if (!jenkinsfileChanged && !backendChanged && !renterChanged && !companyChanged && !nginxConfChanged && !aiFaceChanged) {
                        echo "No relevant changes detected. Skipping deployment."
                        currentBuild.result = 'NOT_BUILT'
                        error("No changes detected in backend, renter, company, nginx, or ai")
                    }

                    echo "Build Triggered - Backend: ${env.BUILD_BACKEND}, Renter: ${env.BUILD_RENTER}, Company: ${env.BUILD_COMPANY}, Nginx: ${env.BUILD_NGINX_CONF}, AI-Face: ${env.BUILD_AI_VERIFY}"
                }
            }
        }

        // ============================================================
        // 2. 인프라 확인 (MySQL, Redis 실행 여부)
        // ============================================================
        stage('Ensure Infrastructure') {
            steps {
                script {
                    sh '''
                        set -e
                        echo "Checking Docker network..."
                        docker network inspect ${DOCKER_NETWORK} >/dev/null 2>&1 || docker network create ${DOCKER_NETWORK}

                        echo "Checking infrastructure containers..."
                        if ! docker ps | grep -q ${MYSQL_CONTAINER}; then
                            echo "MySQL not running. Infrastructure must be started manually on the server."
                            echo "Run: cd ~/infra && docker-compose up -d"
                            exit 1
                        else
                            echo "Infrastructure already running"
                        fi
                    '''
                }
            }
        }

        // ============================================================
        // 3. Backend 빌드 (Gradle)
        // ============================================================
        stage('Build Backend (Gradle)') {
            when {
                expression { env.BUILD_BACKEND == 'true' }
            }
            steps {
                dir('backend') {
                    sh '''
                        set -e
                        echo "Building Spring Boot application..."
                        chmod +x gradlew
                        ./gradlew clean build -x test
                    '''
                }
            }
        }

        // ============================================================
        // 4. Backend Docker 배포 (Blue-Green)
        // ============================================================
        stage('Docker Build & Deploy Backend') {
            when {
                expression { env.BUILD_BACKEND == 'true' }
            }
            steps {
                dir('backend') {
                    script {
                        withCredentials([file(credentialsId: 'backend-env-file', variable: 'SECRET_ENV_PATH')]) {
                            sh '''
                                set -e
                                echo "=== Backend Blue-Green Deployment ==="

                                CURRENT_COLOR=$(cat /home/ubuntu/backend/active_color 2>/dev/null || echo "blue")
                                if [ "$CURRENT_COLOR" = "blue" ]; then
                                    TARGET_COLOR="green"
                                else
                                    TARGET_COLOR="blue"
                                fi

                                echo "Backend: $CURRENT_COLOR -> $TARGET_COLOR"

                                echo "Building Backend Docker image..."
                                docker build -t ${BACKEND_IMAGE} .

                                echo "Starting backend-$TARGET_COLOR..."
                                docker stop backend-$TARGET_COLOR 2>/dev/null || true
                                docker rm backend-$TARGET_COLOR 2>/dev/null || true

                                docker run -d \
                                    --name backend-$TARGET_COLOR \
                                    --network ${DOCKER_NETWORK} \
                                    --restart unless-stopped \
                                    --env-file ${SECRET_ENV_PATH} \
                                    -e TZ=Asia/Seoul \
                                    -e AI_YOLO_URL=${AI_YOLO_URL} \
                                    ${BACKEND_IMAGE}

                                echo "Waiting for backend-$TARGET_COLOR to be healthy..."
                                sleep 10
                                docker ps | grep backend-$TARGET_COLOR

                                mkdir -p /home/ubuntu/backend
                                echo "$TARGET_COLOR" > /home/ubuntu/backend/active_color

                                echo "=== Backend deployed to $TARGET_COLOR ==="
                            '''
                        }
                    }
                }
            }
        }

        // ============================================================
        // 5. Renter App 배포 (Blue-Green)
        // 경로: / (root)
        // 정적 파일: /home/ubuntu/renter/dist-{color}
        // ============================================================
        stage('Build & Deploy Renter (Blue-Green)') {
            when {
                expression { env.BUILD_RENTER == 'true' }
            }
            steps {
                withCredentials([file(credentialsId: 'renter-env-file', variable: 'RENTER_ENV_FILE')]) {
                    sh '''
                        set -euo pipefail
                        echo "=== Renter Blue-Green Deployment ==="

                        # .env.production 주입
                        cp "$RENTER_ENV_FILE" renter/.env.production

                        # 디렉토리 초기화 (최초 실행 시)
                        mkdir -p /home/ubuntu/renter/dist-blue
                        mkdir -p /home/ubuntu/renter/dist-green

                        # 현재 활성 색상 확인 (없으면 blue가 기본)
                        CURRENT_COLOR=$(cat /home/ubuntu/renter/active_color 2>/dev/null || echo "blue")

                        # 배포 대상 색상 결정 (토글)
                        if [ "$CURRENT_COLOR" = "blue" ]; then
                            TARGET_COLOR="green"
                        else
                            TARGET_COLOR="blue"
                        fi

                        echo "Renter: $CURRENT_COLOR -> $TARGET_COLOR"

                        # 1. React 빌드
                        echo "Building Renter application..."
                        docker build --no-cache -t renter-builder -f renter/Dockerfile .

                        # 2. 빌드 결과물을 대상 디렉토리에 복사
                        echo "Copying build output to dist-$TARGET_COLOR..."
                        rm -rf /home/ubuntu/renter/dist-$TARGET_COLOR/*
                        docker run --rm -v /home/ubuntu/renter/dist-$TARGET_COLOR:/output renter-builder sh -c "cp -r /tmp/dist/* /output/"

                        # 3. 활성 색상 업데이트
                        echo "$TARGET_COLOR" > /home/ubuntu/renter/active_color

                        echo "=== Renter deployed to $TARGET_COLOR ==="
                    '''
                }
            }
        }

        // ============================================================
        // 6. Company App 배포 (Blue-Green)
        // 경로: /company/
        // 정적 파일: /home/ubuntu/company/dist-{color}
        // Vite base: '/company/'
        // ============================================================
        stage('Build & Deploy Company (Blue-Green)') {
            when {
                expression { env.BUILD_COMPANY == 'true' }
            }
            steps {
                withCredentials([file(credentialsId: 'renter-env-file', variable: 'RENTER_ENV_FILE')]) {
                    sh '''
                        set -euo pipefail
                        echo "=== Company Blue-Green Deployment ==="

                        # .env.production 주입
                        cp "$RENTER_ENV_FILE" company/.env.production

                        # 디렉토리 초기화 (최초 실행 시)
                        mkdir -p /home/ubuntu/company/dist-blue
                        mkdir -p /home/ubuntu/company/dist-green

                        # 현재 활성 색상 확인 (없으면 blue가 기본)
                        CURRENT_COLOR=$(cat /home/ubuntu/company/active_color 2>/dev/null || echo "blue")

                        # 배포 대상 색상 결정 (토글)
                        if [ "$CURRENT_COLOR" = "blue" ]; then
                            TARGET_COLOR="green"
                        else
                            TARGET_COLOR="blue"
                        fi

                        echo "Company: $CURRENT_COLOR -> $TARGET_COLOR"

                        # 1. React 빌드
                        echo "Building Company application..."
                        docker build --no-cache -t company-builder -f company/Dockerfile .

                        # 2. 빌드 결과물을 대상 디렉토리에 복사
                        echo "Copying build output to dist-$TARGET_COLOR..."
                        rm -rf /home/ubuntu/company/dist-$TARGET_COLOR/*
                        docker run --rm -v /home/ubuntu/company/dist-$TARGET_COLOR:/output company-builder sh -c "cp -r /tmp/dist/* /output/"

                        # 3. 활성 색상 업데이트
                        echo "$TARGET_COLOR" > /home/ubuntu/company/active_color

                        echo "=== Company deployed to $TARGET_COLOR ==="
                    '''
                }
            }
        }

        // ============================================================
        // 7. AI-Face 빌드 & 배포
        // ============================================================
        stage('Build & Deploy AI-Face') {
            when {
                expression { env.BUILD_AI_VERIFY == 'true' }
            }
            steps {
                script {
                    withCredentials([file(credentialsId: 'ai-verify-env-file', variable: 'AI_FACE_ENV_PATH')]) {
                        sh '''
                            set -e
                            echo "=== AI-Face Deployment ==="

                            mkdir -p /home/ubuntu/ai-verify
                            cp ${AI_FACE_ENV_PATH} /home/ubuntu/ai-verify/.env

                            echo "Building AI-Face Docker image..."
                            docker build -t ${AI_VERIFY_IMAGE} ai/verify/

                            echo "Restarting ai-verify container..."
                            docker stop ${AI_VERIFY_CONTAINER} 2>/dev/null || true
                            docker rm ${AI_VERIFY_CONTAINER} 2>/dev/null || true

                            docker run -d \
                                --name ${AI_VERIFY_CONTAINER} \
                                --network ${DOCKER_NETWORK} \
                                --restart unless-stopped \
                                --env-file /home/ubuntu/ai-verify/.env \
                                ${AI_VERIFY_IMAGE}

                            echo "Waiting for ai-verify to start..."
                            sleep 10
                            docker ps | grep ${AI_VERIFY_CONTAINER}

                            echo "=== AI-Face deployed ==="
                        '''
                    }
                }
            }
        }

        // ============================================================
        // 8. Nginx 설정 업데이트
        // - Renter/Company/Nginx 변경 시 항상 실행
        // - placeholder 치환 후 nginx reload (Zero Downtime)
        // ============================================================
        stage('Update Nginx Config') {
            when {
                expression { env.BUILD_BACKEND == 'true' || env.BUILD_RENTER == 'true' || env.BUILD_COMPANY == 'true' || env.BUILD_NGINX_CONF == 'true' || env.BUILD_AI_VERIFY == 'true' }
            }
            steps {
                sh '''
                    set -euo pipefail
                    echo "=== Updating Nginx Configuration ==="

                    # 현재 활성 색상 확인
                    BACKEND_COLOR=$(cat /home/ubuntu/backend/active_color 2>/dev/null || echo "blue")
                    RENTER_COLOR=$(cat /home/ubuntu/renter/active_color 2>/dev/null || echo "blue")
                    COMPANY_COLOR=$(cat /home/ubuntu/company/active_color 2>/dev/null || echo "blue")

                    echo "Active - Backend: $BACKEND_COLOR, Renter: $RENTER_COLOR, Company: $COMPANY_COLOR"

                    # nginx.conf 생성 (placeholder 치환)
                    # sed -i는 새 inode를 생성해 Docker bind mount를 깨뜨리므로
                    # 임시 파일에 치환 후 cat으로 기존 inode에 덮어씀
                    sed \
                        -e "s|__BACKEND_HOST__|backend-$BACKEND_COLOR|g" \
                        -e "s|__RENTER_ROOT__|/usr/share/nginx/html/renter-$RENTER_COLOR|g" \
                        -e "s|__COMPANY_ROOT__|/usr/share/nginx/html/company-$COMPANY_COLOR|g" \
                        -e "s|__AI_YOLO_URL__|${AI_YOLO_URL}|g" \
                        infra/nginx/nginx.conf > /tmp/nginx.conf.rendered
                    cat /tmp/nginx.conf.rendered > /home/ubuntu/infra/nginx/nginx.conf

                    # Nginx 설정 검증 후 무중단 reload
                    docker exec ${NGINX_CONTAINER} nginx -t
                    docker exec ${NGINX_CONTAINER} nginx -s reload

                    echo "✅ Nginx updated (Backend: $BACKEND_COLOR, Renter: $RENTER_COLOR, Company: $COMPANY_COLOR)"
                '''
            }
        }

    }

    post {
        success {
            echo "✅ Deployment successful!"
        }
        failure {
            echo "❌ Deployment failed!"
        }
        always {
            echo "Pipeline finished."
        }
    }
}
