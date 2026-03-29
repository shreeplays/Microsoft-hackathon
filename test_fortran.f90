program main
    implicit none
    integer :: i, result

    print *, "Start"

    do i = 1, 3
        result = process_number(i)
        print *, "Result:", result
    end do

    print *, "End"

contains

    function process_number(n) result(res)
        integer, intent(in) :: n
        integer :: res

        if (mod(n, 2) == 0) then
            print *, "Even number"
            res = n * 2
        else
            print *, "Odd number"
            res = n + 1
        end if
    end function process_number

end program main