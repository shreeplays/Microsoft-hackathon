import asyncio
import random
import time


# ─────────────────────────────
# Helper Functions

def load_config():
    print("Loading config...")
    time.sleep(0.2)
    return {"mode": "test", "retry": 3}


def validate_data(data):
    if not data:
        return False

    if "value" not in data:
        return False

    return True


def save_result(result):
    print("Saving result:", result)
    time.sleep(0.1)


# ─────────────────────────────
# Async API Simulation

async def fetch_data():
    await asyncio.sleep(0.2)

    if random.randint(0, 5) > 2:
        return {"value": random.randint(1, 100)}

    return None


async def process_data(data):
    await asyncio.sleep(0.1)

    return data["value"] * 2


# ─────────────────────────────
# Main Pipeline

async def pipeline():

    config = load_config()

    retries = config["retry"]

    for i in range(retries):

        try:

            data = await fetch_data()

            if not validate_data(data):
                print("Invalid data — retrying")
                continue

            result = await process_data(data)

            if result > 100:
                print("Large result detected")

            save_result(result)

            return result

        except Exception as e:
            print("Error:", e)

    return None


# ─────────────────────────────
# Class Example

class Worker:

    def __init__(self, name):
        self.name = name

    async def run(self):

        print(f"Worker {self.name} starting")

        result = await pipeline()

        if result:
            print("Success:", result)
        else:
            print("Failed")

        return result


# ─────────────────────────────
# Multiple Workers

async def run_workers():

    workers = []

    for i in range(3):
        workers.append(Worker(f"W{i}"))

    results = []

    for worker in workers:
        result = await worker.run()
        results.append(result)

    return results


# ─────────────────────────────
# Entry Point

async def main():

    print("Starting test")

    results = await run_workers()

    success = [r for r in results if r]

    if len(success) > 0:
        print("Some succeeded")
    else:
        print("All failed")

    print("Finished")


# ─────────────────────────────

if __name__ == "__main__":
    asyncio.run(main())