import requests
from concurrent.futures import ThreadPoolExecutor


BASE_URL = "http://127.0.0.1:8000"


# Find an event with an available seat
events = requests.get(
    f"{BASE_URL}/api/events",
    timeout=10,
).json()

event = next(
    event for event in events
    if event["available_seats"] > 0
)

event_id = event["id"]


# Get complete seat information
detail = requests.get(
    f"{BASE_URL}/api/events/{event_id}",
    timeout=10,
).json()


# Find an available and unblocked seat
seat = next(
    seat for seat in detail["seats"]
    if not seat["is_booked"] and not seat["is_blocked"]
)

seat_id = seat["id"]
seat_label = seat["label"]


print(f"Testing event_id={event_id}")
print(f"Testing seat_id={seat_id}")
print(f"Testing seat={seat_label}")


URL = f"{BASE_URL}/api/events/{event_id}/bookings"


REQUEST_A = {
    "name": "Interviewer Request A",
    "email": "request-a@example.com",
    "seat_ids": [seat_id],
}


REQUEST_B = {
    "name": "Interviewer Request B",
    "email": "request-b@example.com",
    "seat_ids": [seat_id],
}


def send_booking(payload):

    try:

        response = requests.post(
            URL,
            json=payload,
            timeout=10,
        )

        return {
            "status": response.status_code,
            "body": response.text,
        }

    except Exception as e:

        return {
            "status": "ERROR",
            "body": str(e),
        }


with ThreadPoolExecutor(max_workers=2) as executor:

    future_a = executor.submit(
        send_booking,
        REQUEST_A,
    )

    future_b = executor.submit(
        send_booking,
        REQUEST_B,
    )

    result_a = future_a.result()
    result_b = future_b.result()


print("\n========== REQUEST A ==========")
print("Status:", result_a["status"])
print("Body:", result_a["body"])


print("\n========== REQUEST B ==========")
print("Status:", result_b["status"])
print("Body:", result_b["body"])


statuses = {
    result_a["status"],
    result_b["status"],
}


print("\n========== CONCURRENCY RESULT ==========")

if statuses == {201, 409}:
    print("PASS: One request succeeded and one was rejected.")

elif statuses == {201}:
    print("FAIL: Both requests succeeded. DOUBLE BOOKING may be possible.")

elif statuses == {409}:
    print("FAIL: Both requests were rejected.")

else:
    print("FAIL: Unexpected response.")