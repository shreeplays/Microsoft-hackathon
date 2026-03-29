module NumberProcessor;

integer i;
integer result;

function integer process_number;
    input integer n;
    begin
        if (n % 2 == 0) begin
            $display("Even number");
            process_number = n * 2;
        end else begin
            $display("Odd number");
            process_number = n + 1;
        end
    end
endfunction

initial begin
    $display("Start");

    for (i = 1; i <= 3; i = i + 1) begin
        result = process_number(i);
        $display("Result: %d", result);
    end

    $display("End");
end

endmodule