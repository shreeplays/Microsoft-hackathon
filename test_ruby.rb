def process_number(n)
  if n % 2 == 0
    puts "Even number"
    return n * 2
  else
    puts "Odd number"
    return n + 1
  end
end

def main
  puts "Start"

  for i in 1..3
    result = process_number(i)
    puts "Result: #{result}"
  end

  puts "End"
end

main