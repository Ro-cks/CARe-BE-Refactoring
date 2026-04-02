const fs = require('fs')
const path = require('path')

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

const files = walk('c:/Users/SSAFY/Desktop/hawon/02-PJT/S14P21E201/company/src')
const koreanRegex = /[가-힣]/

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (koreanRegex.test(line)) {
      if (!line.includes('//') && !line.includes('/*') && !line.includes('t(') && !line.includes('*') && !line.includes('eslint') && !line.includes('console.log') && !line.includes('ko.json')) {
        console.log(`${file}:${i+1} - ${line.trim()}`)
      }
    }
  })
})
