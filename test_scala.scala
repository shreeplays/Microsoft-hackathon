object NumberProcessor {

  def processNumber(n: Int): Int = {
    if (n % 2 == 0) {
      println("Even number")
      n * 2
    } else {
      println("Odd number")
      n + 1
    }
  }

  def main(args: Array[String]): Unit = {
    println("Start")

    for (i <- 1 to 3) {
      val result = processNumber(i)
      println(s"Result: $result")
    }

    println("End")
  }
}