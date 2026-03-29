fun processNumber(n: Int): Int {
    return if (n % 2 == 0) {
        println("Even number")
        n * 2
    } else {
        println("Odd number")
        n + 1
    }
}

fun main() {
    println("Start")

    for (i in 1..3) {
        val result = processNumber(i)
        println("Result: $result")
    }

    println("End")
}