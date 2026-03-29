defmodule Processor do
  def process_number(n) do
    if rem(n, 2) == 0 do
      IO.puts("Even number")
      n * 2
    else
      IO.puts("Odd number")
      n + 1
    end
  end
end

defmodule Main do
  def run do
    IO.puts("Start")

    for i <- 1..3 do
      result = Processor.process_number(i)
      IO.puts("Result: #{result}")
    end

    IO.puts("End")
  end
end

Main.run()