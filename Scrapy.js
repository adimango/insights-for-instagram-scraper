const puppeteer = require(`puppeteer`)
const ora = require(`ora`)
const chalk = require(`chalk`)
const fs = require(`fs`)

class Scrapy {

    constructor(path = `instagram`, host = `https://instagram.com/`) {
        this.path = path
        this.host = host
        this.spinner = ora().start()
    }

    get url() {
        return `${this.host}${this.path}`
    }

    async start() {
        this.spinner.text = chalk.yellow(`Scraping url: ${this.url}`)
        this.browser = await puppeteer.launch()
        this.page = await this.browser.newPage()
        
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US'
        })

        await this.page.goto(this.url, {
            waitUntil: `networkidle0`
        })

        if (await this.page.$(`.dialog-404`)) {
            this.spinner.fail(`The url you followed may be broken`);
            process.exit()
        }

        this.spinner.succeed(chalk.green(`Valid page found`))
        this.spinner.start()
        this.evaluate()
    }

    async evaluate() {
        try {
            this.items = await this.load(100)
        } catch (error) {
            this.spinner.fail(`There was a problem parsing the page`)
            process.exit()
        }
        this.spinner.succeed(chalk.green(`Scraped ${this.items.size} posts`))
        this.buildJSON()
        await this.page.close()
        await this.browser.close()
    }

    async load(maxItemsSize) {
        this.maxItemsSize = maxItemsSize
        var page = this.page
        let previousHeight
        var media = new Set()
        var index = `.`

        while (maxItemsSize == null || media.size < maxItemsSize) {
            try {
                previousHeight = await page.evaluate(`document.body.scrollHeight`)
                await page.evaluate(`window.scrollTo(0, document.body.scrollHeight)`)
                await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`)
                await page.waitFor(1000)
                this.spinner.text = chalk.yellow(`Scrolling${index}`)

                const nodes = await page.evaluate(() => {
                    const images = document.querySelectorAll(`a > div > div.KL4Bh > img`)
                    return [].map.call(images, img => img.src)
                })

                nodes.forEach(element => {
                    if (media.size < maxItemsSize) {
                        media.add(element)
                    }
                })

                index = index + `.`
            }
            catch (error) {
                console.error(error)
                break
            }
        }
        return media
    }

    buildJSON() {
        var tmp = []
        this.items.forEach(url => {
            tmp.push({
                "thumbnail_src": url,
                "accessibility_caption": ""
            })
        })          
        fs.writeFileSync('../nodes.json', JSON.stringify(tmp));
    }
}

module.exports = Scrapy
