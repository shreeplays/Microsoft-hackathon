// ==============================
// Configuration
// ==============================

const CONFIG = {
    retries: 3,
    timeout: 2000,
    debug: true
};


// ==============================
// Logger Utility
// ==============================

class Logger {

    static info(message){
        console.log("[INFO]", message)
    }

    static warn(message){
        console.warn("[WARN]", message)
    }

    static error(message){
        console.error("[ERROR]", message)
    }

}


// ==============================
// Mock API Service
// ==============================

class ApiService {

    async fetchData(endpoint){

        Logger.info("Fetching from " + endpoint)

        await this.sleep(300)

        if(Math.random() < 0.2){
            throw new Error("Random API failure")
        }

        return {
            status: 200,
            data: this.generateMockData()
        }
    }


    generateMockData(){

        const items = []

        for(let i=0;i<20;i++){
            items.push({
                id: i,
                name: "Item_" + i,
                value: Math.floor(Math.random()*100)
            })
        }

        return items
    }


    sleep(ms){
        return new Promise(resolve => setTimeout(resolve, ms))
    }

}


// ==============================
// Data Processor
// ==============================

class DataProcessor {

    validate(data){

        if(!Array.isArray(data)){
            throw new Error("Invalid data format")
        }

        return data.filter(item => item.value > 10)
    }


    transform(data){

        return data.map(item => {
            return {
                ...item,
                score: item.value * 2,
                category: item.value > 50 ? "HIGH" : "LOW"
            }
        })
    }


    summarize(data){

        let total = 0

        data.forEach(item => {
            total += item.value
        })

        return {
            total,
            average: total / data.length
        }
    }

}


// ==============================
// Retry Helper
// ==============================

async function retry(fn, retries){

    for(let i=0;i<retries;i++){

        try{
            return await fn()
        }
        catch(err){
            Logger.warn("Retry " + i)

            if(i === retries-1){
                throw err
            }
        }

    }

}


// ==============================
// UI Renderer
// ==============================

class Renderer {

    renderList(data){

        data.forEach(item=>{
            Logger.info(
                item.name + " -> " + item.value
            )
        })

    }


    renderSummary(summary){

        Logger.info("Total: " + summary.total)
        Logger.info("Average: " + summary.average)

    }

}


// ==============================
// Controller
// ==============================

class Controller {

    constructor(){
        this.api = new ApiService()
        this.processor = new DataProcessor()
        this.renderer = new Renderer()
    }


    async run(){

        try{

            const result = await retry(
                () => this.api.fetchData("/test"),
                CONFIG.retries
            )

            const valid = this.processor.validate(
                result.data
            )

            const transformed =
                this.processor.transform(valid)

            const summary =
                this.processor.summarize(transformed)

            this.renderer.renderList(transformed)

            this.renderer.renderSummary(summary)

        }
        catch(error){

            Logger.error(error.message)

        }

    }

}


// ==============================
// Event Simulation
// ==============================

function simulateUserAction(){

    Logger.info("User clicked run")

    const controller = new Controller()

    controller.run()

}


// ==============================
// Periodic Monitor
// ==============================

function startMonitor(){

    let counter = 0

    const interval = setInterval(()=>{

        Logger.info("Heartbeat " + counter)

        counter++

        if(counter > 5){
            clearInterval(interval)
            Logger.info("Monitor stopped")
        }

    }, 1000)

}


// ==============================
// Additional Utility Functions
// ==============================

function generateRandomString(length){

    const chars =
        "abcdefghijklmnopqrstuvwxyz"

    let result = ""

    for(let i=0;i<length;i++){

        const index =
            Math.floor(Math.random()*chars.length)

        result += chars[index]
    }

    return result
}


function heavyComputation(){

    let total = 0

    for(let i=0;i<10000;i++){

        total += Math.sqrt(i)

    }

    return total
}


// ==============================
// Main Entry
// ==============================

async function main(){

    Logger.info("Starting system")

    simulateUserAction()

    startMonitor()

    const value = heavyComputation()

    Logger.info("Computation result " + value)

    Logger.info("Random string " +
        generateRandomString(10)
    )

}


// ==============================
// Run
// ==============================

main()