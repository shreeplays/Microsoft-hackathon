int processNumber(int n) {
  if (n % 2 == 0) {
    print("Even number");
    return n * 2;
  } else {
    print("Odd number");
    return n + 1;
  }
}

void main() {
  print("Start");

  for (int i = 1; i <= 3; i++) {
    int result = processNumber(i);
    print("Result: $result");
  }

  print("End");
}