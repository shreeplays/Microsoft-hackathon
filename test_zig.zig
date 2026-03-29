const std = @import("std");

fn processNumber(n: i32) i32 {
    if (n % 2 == 0) {
        std.debug.print("Even number\n", .{});
        return n * 2;
    } else {
        std.debug.print("Odd number\n", .{});
        return n + 1;
    }
}

pub fn main() void {
    std.debug.print("Start\n", .{});

    var i: i32 = 1;
    while (i <= 3) : (i += 1) {
        const result = processNumber(i);
        std.debug.print("Result: {}\n", .{result});
    }

    std.debug.print("End\n", .{});
}