# CARe 백엔드 분쟁·정산 리팩토링

> SSAFY 14기 팀 프로젝트 **CARe**의 백엔드 중 **분쟁·정산 파트를 리팩토링하는 저장소**입니다.
> 리팩토링 전 원본 코드는 [`ssafy-final`](https://github.com/Ro-cks/CARe-BE-Refactoring/tree/ssafy-final) 태그에서 볼 수 있습니다.

## CARe 소개

블록체인 기반 렌터카 서비스입니다. 차량 반납 전후의 흠집을 AI로 비교하고, 흠집을 두고 업체와 렌터가 다투면 양측 합의를 거쳐 CARE 토큰으로 정산합니다. 정산 합의와 결과는 블록체인에 기록합니다.

| 폴더 | 내용 | 기술 |
|---|---|---|
| `backend` | API 서버 | Java 17, Spring Boot 3.5, Spring Data JPA, MySQL, Redis, Web3j |
| `ai` | 흠집 비교·OCR 서버 | Python |
| `blockchain` | 토큰·NFT·정산 컨트랙트 | Solidity, Hardhat |
| `renter`, `company` | 렌터용·업체용 웹 | React, Vite |
| `infra` | 배포 설정 | NGINX, Jenkins |

SSAFY 14기 6인 팀이 개발했으며, 이 저장소의 리팩토링은 분쟁·정산 기능을 구현했던 [정현우](https://github.com/Ro-cks)가 진행합니다.

## 리팩토링 목표

- 정산 규칙을 테스트로 고정해 안전하게 고칠 수 있는 상태 만들기
- 서비스 메서드에 흩어진 합의 규칙을 도메인 객체로 분리해 단순화하기
- 돈이 오가는 흐름의 안전성 문제(동시성, 외부 시스템 실패) 수정하기

리팩토링 대상은 `backend/src/main/java/com/care/domain/reservation`의 분쟁·정산 코드입니다.

## 진행 현황

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 테스트 안전망 확보 | 완료 ([#1](https://github.com/Ro-cks/CARe-BE-Refactoring/pull/1)) |
| 2 | 정산 합의 규칙 분리 | 완료 ([#1](https://github.com/Ro-cks/CARe-BE-Refactoring/pull/1)) |
| 3 | 무인증 관리자 API 제거 | 완료 ([#1](https://github.com/Ro-cks/CARe-BE-Refactoring/pull/1)) |
| 4 | 동시 요청 시 이중 이체 방지 | 완료 ([#1](https://github.com/Ro-cks/CARe-BE-Refactoring/pull/1)) |
| 5 | 알림을 트랜잭션 커밋 후 이벤트로 분리 | 예정 |
| 6 | 온체인 실패 감지, 이체 실패 시 토큰 소실, 재제안 금액 불일치 수정 | 예정 |

## 지금까지의 변화

| 항목 | 리팩토링 전 | 리팩토링 후 |
|---|---|---|
| 분쟁·정산 테스트 | 테스트 코드 컴파일 실패로 실행 불가 | 43개 중 41개 통과, 2개는 범위 밖이라 보류 |
| `settleDispute` | 약 140줄, boolean 조합과 중첩 조건문 | 57줄, 합의 결과(`AgreementResult`)에 따른 분기 |
| `Dispute` 엔티티 | 정산 필드 5개, 정산 메서드 6개 | `SettlementAgreement`에 위임 |
| 관리자 API | 인증 없이 열린 컨트롤러·서비스 184줄 | 삭제 |
| 동시 정산 요청 | 토큰이 두 번 이체될 수 있음 | 비관적 락으로 직렬화, 실제 DB에서 검증 |

### 새로 만든 도메인 객체

- **`SettlementAgreement`**: 업체·렌터의 합의 규칙(제안, 역제안, 중복 요청, 완료 후 거부)을 담은 임베디드 타입
- **`SettlementAmount`**: 정산 금액 값 객체. 음수를 막고, 0원은 무과실을 뜻함
- **`AgreementResult`**: 동의 요청의 결과(`BEGIN`, `COUNTER`, `DUPLICATED`, `COMPLETED`). 서비스는 이 값으로 온체인 호출과 알림을 결정

### 주요 결정

- **`SettlementStatus` 제거**: 정산은 항상 렌터가 업체에 지불하고 무과실은 0원이라, 금액과 상태를 따로 저장하면 같은 사실을 두 곳에 두게 됩니다. 금액 하나로 표현하도록 바꾸고, 기존 API 응답 형식은 금액에서 계산해 유지했습니다.
- **낙관적 락 대신 비관적 락**: 정산 중에 블록체인 기록과 토큰 이체를 호출하는데, 이 호출은 DB 롤백으로 되돌아가지 않습니다. 커밋 시점에 충돌을 감지하는 낙관적 락으로는 이미 늦기 때문에, 조회 시점에 행을 잠가 뒤 요청이 앞 요청의 결과를 보고 판단하게 했습니다.

### 의도한 동작 변경

- 정산 요청의 `status` 값은 무시하고, 정산 금액은 항상 렌터가 업체에 지불합니다.
- 0원 합의는 무과실로 처리해 보증금 상태가 `SAFE`가 됩니다.
- 처리 중인 정산에 같은 요청이 또 오면, 앞 요청이 끝난 뒤 이미 완료되었다는 에러를 받습니다.

API URL, 요청·응답 형식, DB 컬럼은 그대로라 프런트엔드는 수정 없이 동작합니다.

## 테스트 실행

```bash
cd backend
./gradlew test --tests "*Dispute*" --tests "*Settlement*"
```

## 남은 과제

- 블록체인 거래 실패를 감지하지 못하고 성공으로 처리함
- 역제안 금액이 온체인 합의에 반영되지 않음
- 토큰 이체 중간에 실패하면 토큰이 차감만 될 수 있음
- DB 트랜잭션이 롤백돼도 SSE 알림은 이미 전송됨
- 잠금을 쥔 채 블록체인 응답을 기다림
- 분쟁·정산 범위 밖: `/companies/**` 경로가 인증 없이 열려 있음
