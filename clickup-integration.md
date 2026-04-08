# This is a guide for integrating clickup into the platform

# OAUTH FLOW (STEP 1)

To allow others to use your app, implement the OAuth2 flow so each user has their own token for accessing their ClickUp resources.

OAuth resources and specs:

Authentication: OAuth 2.0
Grant Type: Authorization Code. Learn more.
Authorization URL: https://app.clickup.com/api
Access Token URL: https://api.clickup.com/api/v2/oauth/token

Note: ClickUp uses the authorization code grant type.

Send users to this URL to connect their ClickUp account:
https://app.clickup.com/api?client_id={client_id}&redirect_uri={redirect_uri}

You can also add a state parameter:
https://app.clickup.com/api?client_id={client_id}&redirect_uri={redirect_uri}&state={state}

Users will be redirected back to the redirect_uri with the authorization code after logging in.

Use the Get Access Token endpoint with client_id, client_secret, and code to get the access token. This token is used in the Authorization: Bearer {access_token} header for all API requests made on behalf of the user.

The access token currently does not expire. This is subject to change

# FETCH USERS WORKSPACES (STEP 2)

# SAMPLE REQUEST

curl --request GET \
 --url https://api.clickup.com/api/v2/team \
 --header 'accept: application/json'

# SAMPLE RESPONSE

{
"teams": [
{
"id": "1234",
"name": "My ClickUp Workspace",
"color": "#000000",
"avatar": "https://clickup.com/avatar.jpg",

    }

]
}

# FETCH SPACES (STEP 3)

# SAMPLE REQUEST

curl --request GET \
 --url https://api.clickup.com/api/v2/team//space \
 --header 'accept: application/json'

# SAMPLE RESPONSE

{
"teams": [
{
"id": "1234",
"name": "My ClickUp Workspace",
"color": "#000000",
"avatar": "https://clickup.com/avatar.jpg",
"members": [
{
"user": {
"id": 123,
"username": "John Doe",
"color": "#000000",
"profilePicture": "https://clickup.com/avatar.jpg"
}
}
]
}
]
}

# FETCH FOLDERS (STEP 4)

# SAMPLE REQUEST

curl --request GET \
 --url https://api.clickup.com/api/v2/space//folder \
 --header 'accept: application/json'

# SAMPLE RESPONSE

{
"folders": {
"id": "1057",
"name": "Folder Name",
"orderindex": 5,
"override_statuses": true,
"hidden": false,
"space": {
"id": "789",
"name": "Space Name",
"access": true
},
"task_count": "20",
"lists": [] # array of strings
}
}

# FETCH LIST

sample request
curl --request GET \
 --url https://api.clickup.com/api/v2/list/ \
 --header 'accept: application/json'

sample response
{
"id": "124",
"name": "Updated List Name",
"orderindex": 1,
"content": "Updated List Content",
"status": {
"status": "red",
"color": "#e50000",
"hide_label": true
},
"priority": {
"priority": "high",
"color": "#f50000"
},
"assignee": null,
"task_count": 10,
"due_date": "1567780450202",
"due_date_time": true,
"start_date": null,
"start_date_time": null,
"folder": {
"id": "456",
"name": "Folder Name",
"hidden": false,
"access": true
},
"space": {
"id": "789",
"name": "Space Name",
"access": true
},
"inbound_address": "add.task.124.ac725f.31518a6a-05bb-4997-92a6-1dcfe2f527ca@tasks.clickup.com",
"archived": false,
"override_statuses": false,
"statuses": [
{
"status": "to do",
"orderindex": 0,
"color": "#d3d3d3",
"type": "open"
},
{
"status": "complete",
"orderindex": 1,
"color": "#6bc950",
"type": "closed"
}
],
"permission_level": "create"
}

# CREATE TASK

# SAMPLE REQUEST

curl --request POST \
 --url https://api.clickup.com/api/v2/list//task \
 --header 'accept: application/json' \
 --header 'content-type: application/json' \
 --data '
{
"name": "New Task Name",
"description": "New Task Description",
"markdown_description": "New Task Description",
"assignees": [
183
],
"archived": false,
"group_assignees": [
"dd01f92f-48ca-446d-88a1-0beb0e8f5f14"
],
"email_assignees": [
"dd01f92f-48ca-446d-88a1-0beb0e8f5f13"
],
"tags": [
"tag name 1"
],
"status": "Open",
"priority": 3,
}
'
status of tag should always be open and tags should be ai support bot and padyna

# SAMPLE RESPONSE // this will be public endpoit used in widget-routes, dont do user authenticated. rather tie it to chatbot and/or organization

{
"id": "9hx",
"custom_id": null,
"custom_item_id": null,
"name": "New Task Name",
"text_content": "New Task Content",
"description": "New Task Content",
"markdown_description": "New Task Content",
"status": {
"status": "in progress",
"color": "#d3d3d3",
"orderindex": 1,
"type": "custom"
},
"orderindex": "1.00000000000000000000000000000000",
"date_created": "1567780450202",
"date_updated": "1567780450202",
"date_closed": null,
"date_done": null,
"creator": {
"id": 183,
"username": "John Doe",
"color": "#827718",
"profilePicture": "https://attachments-public.clickup.com/profilePictures/183_abc.jpg"
},
"assignees": [],
"archived": false,
"group_assignees": [],
"email_assignees": [],
"checklists": [],
"tags": [],
"parent": "abc1234",
"priority": {
"color": "6fddff",
"id": "3",
"orderindex": "3",
"priority": "normal"
},
"due_date": null,
"start_date": null,
"points": 3,
"time_estimate": null,
"time_spent": null,
"custom_fields": [
{
"id": "0a52c486-5f05-403b-b4fd-c512ff05131c",
"name": "My Text Custom field",
"type": "text",
"type_config": {},
"date_created": "1622176979540",
"hide_from_guests": false,
"value": {
"value": "This is a string of text added to a Custom Field."
},
"required": true
}
],
"list": {
"id": "123"
},
"folder": {
"id": "456"
},
"space": {
"id": "789"
},
"url": "https://app.clickup.com/t/9hx"
}
