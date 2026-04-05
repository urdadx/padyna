# JIRA OUATH 2.0

As described in the Overview above, your app should start the authorization flow by directing the user to the authorization URL:

Copy
https://auth.atlassian.com/authorize?
audience=api.atlassian.com&
client_id=YOUR_CLIENT_ID&
scope=REQUESTED_SCOPE_ONE%20REQUESTED_SCOPE_TWO&
redirect_uri=https://YOUR_APP_CALLBACK_URL&
state=YOUR_USER_BOUND_VALUE&
response_type=code&
prompt=consent
Use the authorization URL in a GET request. You can get this URL by going to your app in the developer console, selecting Authorization in the left menu, and selecting Configure next to OAuth 2.0 (3LO). Alternatively, you can construct the URL manually (for example, if you want to specify scopes from multiple products).

The query parameters for the authorization URL are described below:

audience: (required) Set this to api.atlassian.com.
client_id: (required) Set this to the Client ID for your app. Find this in Settings for your app in the developer console.
scope: (required) Set this to the desired scopes:
Separate multiple scopes with a space.
Only choose from the scopes that you have already added to the APIs for your app in the developer console.
You may specify scopes from multiple products.
redirect_uri: (required) Set this to the callback URL configured in Authorization for your app in the developer console.
state: (required for security) Set this to a value that is associated with the user you are directing to the authorization URL, for example, a hash of the user's session ID. Make sure that this is a value that cannot be guessed. You may be able to generate and validate this value automatically, if you are using an OAuth 2.0 client library or an authentication library with OAuth 2.0 support. For more information, including why this parameter is required for security, see What is the state parameter used for? below.
response_type: (required) Set to code as you are requesting an authorization code (not a token).
prompt: (required) Set to consent so that the screen prompting the user to grant access will display.
If successful, the user will be redirected to the app's callback URL, with an authorization code provided as a query parameter called code. This code can be exchanged for an access token, as described in step 2.

Determining the scopes required for an operation
To find out which scopes an operation requires, check the OAuth scopes required field in the relevant API documentation:

Jira Cloud platform REST API documentation
Jira Service Management Cloud REST API documentation
Jira Software Cloud REST API documentation
Confluence Cloud REST API documentation
If the operation has the statement Apps can't access this REST resource, you can't use it with OAuth 2.0 (3LO).

Note, the permissions held by the user an app is acting for always constrain the app, regardless of the app's scopes. For example, if a Jira app has the manage:jira-project scope but the user does not have the Administer Jira permission, the app can not create projects.

2. Exchange authorization code for access token

Copy
curl --request POST \
 --url 'https://auth.atlassian.com/oauth/token' \
 --header 'Content-Type: application/json' \
 --data '{"grant_type": "authorization_code","client_id": "YOUR_CLIENT_ID","client_secret": "YOUR_CLIENT_SECRET","code": "YOUR_AUTHORIZATION_CODE","redirect_uri": "https://YOUR_APP_CALLBACK_URL"}'
client_id: (required) Set this to the Client ID for your app. Find this in Settings for your app in the developer console.
client_secret: (required) Set this to the Secret for your app. Find this in Settings for your app in the developer console.
code: (required) Set this to the authorization code received from the initial authorize call (described above).
redirect_uri: (required) Set this to the callback URL configured for your app in the developer console.
If successful, this call returns an access token similar to this:

Copy
HTTP/1.1 200 OK
Content-Type: application/json

{
"access_token": <string>,
"expires_in": <expiry time of access_token in second>,
"scope": <string>
}
This access token can be used to make API calls, as described below.

3. Make calls to the API using the access token
   Your app now has an access token that it can use to authorize requests to the APIs for the Atlassian site. To make requests, do the following:

Get the cloudid for your site.
Construct the request URL using the cloudid.
Call the API, using the access token and request URL.
3.1 Get the cloudid for your site
Make a GET request to https://api.atlassian.com/oauth/token/accessible-resources passing the access token as a bearer token in the header of the request. For example:

Copy
curl --request GET \
 --url https://api.atlassian.com/oauth/token/accessible-resources \
 --header 'Authorization: Bearer ACCESS_TOKEN' \
 --header 'Accept: application/json'
This will retrieve the sites that have scopes granted by the token (see Check site access for the app below for details). Find your site in the response and copy the id. This is the cloudid for your site.

Here's a few example responses:

A Jira site:

Copy
[
{
"id": "1324a887-45db-1bf4-1e99-ef0ff456d421",
"name": "Site name",
"url": "https://your-domain.atlassian.net",
"scopes": [
"write:jira-work",
"read:jira-user",
"manage:jira-configuration"
],
"avatarUrl": "https:\/\/site-admin-avatar-cdn.prod.public.atl-paas.net\/avatars\/240\/flag.png"
}
]
A Jira Service Management site:

Copy
[
{
"id": "1324a887-45db-1bf4-1e99-ef0ff456d421",
"name": "Site name",
"url": "https://your-domain.atlassian.net",
"scopes": [
"write:jira-work",
"read:jira-user",
"read:servicedesk-request"
],
"avatarUrl": "https:\/\/site-admin-avatar-cdn.prod.public.atl-paas.net\/avatars\/240\/flag.png"
}
]
A Confluence site:

Copy
[
{
"id": "1324a887-45db-1bf4-1e99-ef0ff456d421",
"name": "Site name",
"url": "https://your-domain.atlassian.net",
"scopes": [
"write:confluence-content",
"read:confluence-content.all",
"manage:confluence-configuration"
],
"avatarUrl": "https:\/\/site-admin-avatar-cdn.prod.public.atl-paas.net\/avatars\/240\/flag.png"
}
]
3.2 Construct the request URL
Requests that use OAuth 2.0 (3LO) are made via api.atlassian.com (not https://your-domain.atlassian.net). Construct your request URL using the following structure:

Jira apps: https://api.atlassian.com/ex/jira/{cloudid}/{api}
Confluence apps: https://api.atlassian.com/ex/confluence/{cloudid}/{api}
where:

{cloudid} is the cloudid for your site that you obtained in the previous step. For example, 11223344-a1b2-3b33-c444-def123456789.
{api} is the base path and name of the API. For example:
/rest/api/2/project for the project endpoint in the Jira REST API.
/rest/servicedeskapi/request for the request endpoint in the Jira Service Management REST API.
/rest/api/space for the space endpoint in the Confluence REST API.
Your request URL should look something like this (using the example cloudid and Jira API above):

https://api.atlassian.com/ex/jira/11223344-a1b2-3b33-c444-def123456789/rest/api/2/project

Note that if you are copying the examples in the API documentation, you will need to amend the example URLs as they currently use https://your-domain.atlassian.net/{api} rather than the request URLs shown above.

3.3 Call the API
Make the API call passing the access token as a bearer token in the header of the request. This will authorize the request on the user's behalf.

Copy
curl --request GET \
 --url <request URL> \
 --header 'Authorization: Bearer ACCESS_TOKEN' \
 --header 'Accept: application/json'
For example:

Copy
curl --request GET \
 --url https://api.atlassian.com/ex/jira/11223344-a1b2-3b33-c444-def123456789/rest/api/2/project \
 --header 'Authorization: Bearer aBCxYz654123' \
 --header 'Accept: application/json'

4. Check site access for the app
   An authorization grant is when a user consents to your app. For OAuth 2.0 (3LO) apps, the consent is valid for all sites the app is installed in, as long as the scopes used by your app's APIs don't change. A user's grant can change when either of the following occur:

The user revokes the grant. The app cannot work anywhere after a user has revoked their consent to the app.
The user consents to a new grant of the app. The scopes in the new grant override the scopes in the existing grant.
Therefore, since a grant can change over time, it's important that you check that the user has granted the app the scopes it requires and that your app has correct access to a site and its APIs. To check this, call the accessible-resources endpoint on https://auth.atlassian.com (you used this endpoint in a previous step to get the cloudid for your site). The endpoint is described in detail below:

Get list of resources
GET /oauth/token/accessible-resources

Request
Request parameters: None

Example:

Copy
curl --header 'Authorization: Bearer <access_token>' \
 --url 'https://api.atlassian.com/oauth/token/accessible-resources'
Response
200 OK example (Jira):

Copy
[
{
"id": "8594f221-9797-5f78-1fa4-485e198d7cd0",
"name": "Site name 2",
"url": "https://your-domain2.atlassian.net",
"scopes": [
"write:jira-work",
"read:jira-user" ],
"avatarUrl": "https:\/\/site-admin-avatar-cdn.prod.public.atl-paas.net\/avatars\/240\/koala.png"
},
{
"id": "1324a887-45db-1bf4-1e99-ef0ff456d421",
"name": "Site name 1",
"url": "https://your-domain1.atlassian.net",
"scopes": [
"write:jira-work",
"read:jira-user",
"manage:jira-configuration" ],
"avatarUrl": "https:\/\/site-admin-avatar-cdn.prod.public.atl-paas.net\/avatars\/240\/flag.png"
}
]
Each item in the response describes a container (for example, a Jira site) that your app has access to, the scopes associated with that access, and metadata such as the name and avatar URL (if any). It's important to understand that this endpoint won't tell you anything about the user's permissions, which may limit the resources that your app can access via the site's APIs.

Note, the id is not unique across containers (that is, two entries in the results can have the same id), so you may need to infer the type of container from its scopes.
