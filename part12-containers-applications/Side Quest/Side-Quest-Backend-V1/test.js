const items = {
    'first': new Date(),
    'second': 2,
    'third': 'test'
}


const args = {
    'first': 12,
    third: 'it works'
}

Object.entries(args).forEach(property => {
    items[property[0]] = property[1]
})

console.log(items)