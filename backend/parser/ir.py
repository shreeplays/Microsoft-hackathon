def create_loop(condition, body):
    return {
        "type": "loop",
        "condition": condition,
        "body": body
    }


def create_decision(condition, true_branch, false_branch):
    return {
        "type": "decision",
        "condition": condition,
        "true": true_branch,
        "false": false_branch
    }


def create_process(value):
    return {
        "type": "process",
        "value": value
    }