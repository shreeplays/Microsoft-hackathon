#!/usr/bin/perl
use strict;
use warnings;

sub process_number {
    my ($n) = @_;

    if ($n % 2 == 0) {
        print "Even number\n";
        return $n * 2;
    } else {
        print "Odd number\n";
        return $n + 1;
    }
}

sub main {
    print "Start\n";

    for my $i (1..3) {
        my $result = process_number($i);
        print "Result: $result\n";
    }

    print "End\n";
}

main();