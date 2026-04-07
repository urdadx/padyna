# This is a guide for integrating clickup into the platform

# OAUTH FLOW

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

# FETCH USERS WORKSPACES

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

# FETCH SPACES

# SAMPLE REQUEST

curl --request GET \
 --url https://api.clickup.com/api/v2/team//space \
 --header 'accept: application/json'

# SAMPLE RESPONSE

# CREATE TASK

# SAMPLE REQUEST

curl --request POST \
 --url https://api.clickup.com/api/v2/list//task \
 --header 'accept: application/json' \
 --header 'content-type: application/json'

# SAMPLE RESPONSE
