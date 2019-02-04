const Scrapy = require('./Scrapy.js')

let path = process.argv[2]
let scrapy = new Scrapy(path)
scrapy.start().catch(error => console.error(error))