# Create Event Invitee (Scheduling API)

Creates a new booking for an event invitee. Use this endpoint to book an invitee directly from your app without redirects, iframes, or Calendly-hosted UI.

Standard notifications, calendar invites, reschedules, and workflows run as if booked via the Calendly UI.

# API REQUEST EXAMPLE

curl --request POST \
 --url https://api.calendly.com/invitees \
 --header 'Authorization: ' \
 --header 'Content-Type: application/json' \
 --data '{
"event_type": "https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA",
"start_time": "2019-08-07T06:05:04.321123Z",
"invitee": {
"name": "John Smith",
"first_name": "John",
"last_name": "Smith",
"email": "test@example.com",
"timezone": "America/New_York",
"text_reminder_number": "+1 888-888-8888"
},
"location": {
"kind": "physical",
"location": "string"
},
"questions_and_answers": [
{
"question": "string",
"answer": "string",
"position": 0
}
],
"tracking": {
"utm_campaign": "string",
"utm_source": "string",
"utm_medium": "string",
"utm_content": "string",
"utm_term": "string",
"salesforce_uuid": "string"
},
"event_guests": [
"janedoe@calendly.com"
]
}'

# API RESPONSE

{
"resource": {
"uri": "https://calendly.com/scheduled_events/AAAAAAAAAAAAAAAA/invitees/AAAAAAAAAAAAAAAA",
"email": "test@example.com",
"first_name": "John",
"last_name": "Doe",
"name": "John Doe",
"status": "active",
"questions_and_answers": [
{
"question": "string",
"answer": "string",
"position": 0
}
],
"timezone": "string",
"event": "https://api.calendly.com/scheduled_events/AAAAAAAAAAAAAAAA",
"created_at": "2019-01-02T03:04:05.678123Z",
"updated_at": "2019-08-07T06:05:04.321123Z",
"tracking": {
"utm_campaign": "string",
"utm_source": "string",
"utm_medium": "string",
"utm_content": "string",
"utm_term": "string",
"salesforce_uuid": "string"
},
"text_reminder_number": "+1 404-555-1234",
"rescheduled": true,
"old_invitee": "http://example.com",
"new_invitee": "http://example.com",
"cancel_url": "http://example.com",
"reschedule_url": "http://example.com",
"routing_form_submission": "https://api.calendly.com/routing_form_submissions/AAAAAAAAAAAAAAAA",
"cancellation": {
"canceled_by": "string",
"reason": "string",
"canceler_type": "host",
"created_at": "2019-01-02T03:04:05.678123Z"
},
"payment": {
"external_id": "string",
"provider": "stripe",
"amount": 0,
"currency": "AUD",
"terms": "sample terms of payment (up to 1,024 characters)",
"successful": true
},
"no_show": {
"uri": "string",
"created_at": "2019-01-02T03:04:05.678123Z"
},
"reconfirmation": {
"created_at": "2020-11-23T17:51:18.341657Z",
"confirmed_at": "2020-11-23T17:51:18.341657Z"
},
"scheduling_method": "instant_book",
"invitee_scheduled_by": "http://example.com"
}
}
