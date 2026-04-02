const fs = require('fs')
const path = require('path')

const srcDir = 'c:/Users/SSAFY/Desktop/hawon/02-PJT/S14P21E201/company/src'

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    file = path.join(dir, file)
    const stat = fs.statSync(file)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file))
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file)
    }
  })
  return results
}

const files = walk(srcDir)
const tRegex = /t\(['"]([^'"]+)['"]/g

let allUsedKeys = new Set()

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8')
  let match
  while ((match = tRegex.exec(content)) !== null) {
    allUsedKeys.add(match[1])
  }
})

const koJsonPath = path.join(srcDir, 'locales', 'ko.json')
const koJson = JSON.parse(fs.readFileSync(koJsonPath, 'utf8'))

function hasKey(obj, path) {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current[part] === undefined) return false
    current = current[part]
  }
  return true
}

let missingKeys = []
for (const key of allUsedKeys) {
  if (!hasKey(koJson, key)) {
    missingKeys.push(key)
  }
}

if (missingKeys.length > 0) {
  console.log('Missing Keys:')
  console.log(missingKeys.join('\n'))
} else {
  console.log('All used keys exist in ko.json!')
}
