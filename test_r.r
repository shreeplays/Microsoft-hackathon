process_number <- function(n) {
  if (n %% 2 == 0) {
    print("Even number")
    return(n * 2)
  } else {
    print("Odd number")
    return(n + 1)
  }
}

main <- function() {
  print("Start")

  for (i in 1:3) {
    result <- process_number(i)
    print(paste("Result:", result))
  }

  print("End")
}

main()