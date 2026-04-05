# OAUTH 2.0 DOCUMENTATION

openapi: 3.0.0
tags:

- name: OAuth
  info:
  title: Calendly OAuth 2.0
  version: '1.0'
  contact:
  email: support+developer@calendly.com
  name: Calendly Developer Support
  url: 'https://developer.calendly.com/get-help'
  description: |-
  Use your application's client ID and secret to authorize using OAuth.

      - For mobile or native applications, use a specific `redirect_uri`, Proof Key for Code Exchange (PKCE), and SH256 for `code_challenge_method`. For more information, see [this native and mobile authentication guide](https://oauth.net/2/pkce/).

      * To retrieve the access token, you'll need to access Calendly data:

        1. To initiate the OAuth authorization flow, redirect your user to [Get Authorization Code](https://calendly.stoplight.io/docs/api-docs/b3A6NTkxNDA5-get-authorization-code) endpoint.

        2. To retrieve the access token, make a POST request to [Get Access Token](https://calendly.stoplight.io/docs/api-docs/b3A6NTkxNDA4-get-access-token) endpoint.

        3. To test the access token, make a call to the [Get Current User](https://calendly.stoplight.io/docs/api-docs/b3A6MTEzMDIyOQ-get-current-user) endpoint.

  termsOfService: 'https://developer.calendly.com/developer-policy'
  servers:

- url: 'https://auth.calendly.com'
  paths:
  /oauth/token:
  post:
  summary: Get Access Token
  responses:
  '200':
  $ref: '#/components/responses/TokenResponse'
  '400':
  description: Bad Request
  content:
  application/json:
  schema:
  type: object
  properties:
  error:
  type: string
  enum: - invalid_request - invalid_grant - unsupported_grant_type
  description: Error code
  error_description:
  type: string
  description: Error description
  required: - error - error_description
  examples:
  Example:
  value:
  error: invalid_grant
  error_description: 'The provided authorization grant is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.'
  '401':
  $ref: '#/components/responses/ErrorResponse'
  '429':
  description: Too Many Requests
  content:
  application/json:
  schema:
  title: Rate Limit Error Response
  description: Rate limiting error response
  type: object
  properties:
  error:
  type: string
  enum: - temporarily_unavailable
  description: Error code indicating the service is temporarily unavailable due to rate limiting
  error_description:
  type: string
  description: Error description
  required: - error - error_description
  x-examples:
  Example:
  error: temporarily_unavailable
  error_description: Rate limit exceeded
  examples:
  Example:
  value:
  error: temporarily_unavailable
  error_description: Rate limit exceeded
  operationId: post-oauth-refresh-token
  description: |-
  Use Access Tokens to access Calendly resources on behalf of an authenticated user.

          The Basic HTTP Authentication security scheme is for web clients only.

          To make a call to this endpoint:

          * Web clients: pass client_id and client_secret via Basic HTTP Authorization header

          * Native clients: include client_id as a body param within the API call

          Note:

          * Access Tokens expire after 2 hours.

          * Refresh Tokens don't expire until they are used.

          * Only 8 oauth tokens per user can be requested within a span of 1 minute
        requestBody:
          required: true
          content:
            application/x-www-form-urlencoded:
              schema:
                anyOf:
                  - $ref: '#/components/schemas/webTokenRequestWithCode'
                  - $ref: '#/components/schemas/webTokenRequestWithRefreshToken'
                  - $ref: '#/components/schemas/nativeTokenRequestWithCode'
                  - $ref: '#/components/schemas/nativeTokenRequestWithRefreshToken'
              examples:
                web:
                  summary: Example - Web application
                  value:
                    grant_type: refresh_token
                    refresh_token: abc
                native:
                  summary: Example - Native application
                  value:
                    client_id: '123'
                    client_secret: '456'
                    grant_type: refresh_token
                    refresh_token: abc
          description: ''
        parameters:
          - schema:
              type: string
              enum:
                - application/x-www-form-urlencoded
              default: application/x-www-form-urlencoded
            in: header
            name: Content-Type
            required: true
            description: Indicates the media type of the resource
        tags:
          - OAuth
        security:
          - basicAuth: []

  /oauth/authorize:
  get:
  summary: Get Authorization Code
  operationId: get-oauth-authorize
  parameters: - schema:
  type: string
  in: query
  name: client_id
  required: true
  description: The ID provided by Calendly for the web application - schema:
  type: string
  enum: - code
  in: query
  name: response_type
  required: true
  description: The response type (which is always "code") - schema:
  type: string
  in: query
  name: redirect_uri
  example: 'https://my.site.com/auth/calendly'
  required: true
  description: The redirect URI for your OAuth application - schema:
  type: string
  in: query
  name: code_challenge_method
  description: The method used for native clients
  example: S256
  required: true - schema:
  type: string
  in: query
  name: code_challenge
  description: Use a code challenge for native clients
  required: true
  description: |-
  The **Authorization Code** is a temporary code that your client exchanges for an access token. While this flow is supported, we recommend using the PKCE flow for all OAuth applications.

          ## Web applications

          To receive user's Access Token, have your app redirect the user to Calendly's authorization page with the `client_id` and `redirect_uri` replaced with your application's `client_id` and `redirect_uri` (see example below). Note that this url must be requested using a web browser.

          ```
          https://auth.calendly.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=https://my.site.com/auth/calendly
          ```

          When a user grants access, their browser is redirected to the specified `redirect_uri`, the Authorization Code is passed inside the `code` query parameter:

          ```
          https://my.site.com/auth/calendly?code=f04281d639d8248435378b0365de7bd1f53bf452eda187d5f1e07ae7f04546d6
          ```

          ## PKCE Flow (recommended)

          The flow for mobile or native applications requires PKCE conforming to the RFC 7636 specification. This flow is also recommended for web apps to mitigate against authorization code injection. For more information, see [this guide](https://oauth.net/2/pkce/). An example of a javascript implementation can be found [here](https://github.com/aaronpk/pkce-vanilla-js).

          To receive an Authorization Code:

          * Generate a `CODE_VERIFIER`
          * Build a `CODE_CHALLENGE`
          * Redirect the user to Calendly's authorization page with the `client_id`, `redirect_uri`, and `code_challenge` replaced with your application's `client_id`, `redirect_uri`, and the `code_challenge` generated in the step above (see example below). Note that this url must be requested using a web browser.

          ```
          https://auth.calendly.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=com.site.app://auth/calendly&code_challenge_method=S256&code_challenge=CODE_CHALLENGE
          ```

          After the user grants access, they will be redirected back to your app with the Authorization Code:

          ```
          com.site.app://auth/calendly?code=f04281d639d8248435378b0365de7bd1f53bf452eda187d5f1e07ae7f04546d6
          ```
        tags:
          - OAuth
        responses:
          '200':
            description: OK

  /oauth/revoke:
  post:
  summary: Revoke Access/Refresh Token
  operationId: post-oauth-revoke
  responses:
  '200':
  description: OK
  content:
  application/json:
  schema:
  type: object
  additionalProperties: false
  examples:
  Example:
  value: {}
  '400':
  $ref: '#/components/responses/InvalidRequest'
  '403':
  description: Forbidden
  content:
  application/json:
  schema:
  type: object
  properties:
  error:
  type: string
  description: Error code
  error_description:
  type: string
  description: Error description
  required: - error - error_description
  examples:
  Example:
  value:
  error: unauthorized_client
  error_description: You are not authorized to revoke this token
  description: Use this endpoint to revoke an access/refresh token.
  requestBody:
  required: true
  content:
  application/x-www-form-urlencoded:
  schema:
  type: object
  properties:
  client_id:
  type: string
  description: The ID provided by Calendly for the web application
  client_secret:
  type: string
  description: The secret provided by Calendly
  token:
  type: string
  description: The access/refresh token provided by Calendly
  required: - client_id - client_secret - token
  examples:
  Example:
  value:
  client_id: '123'
  client_secret: '456'
  token: abc
  description: ''
  tags: - OAuth
  parameters: - schema:
  type: string
  enum: - application/x-www-form-urlencoded
  default: application/x-www-form-urlencoded
  in: header
  name: Content-Type
  required: true
  description: Indicates the media type of the resource
  /oauth/introspect:
  post:
  summary: Introspect Access/Refresh Token
  operationId: post-oauth-introspect
  responses:
  '200':
  description: OK
  content:
  application/json:
  schema:
  type: object
  properties:
  active:
  type: boolean
  description: Boolean indicator of whether or not the presented token is currently active
  scope:
  type: string
  description: The scope of the access token
  client_id:
  type: string
  description: The ID provided by Calendly for the web application
  token_type:
  type: string
  description: The token type (currently this is always "Bearer")
  exp:
  type: number
  description: The UNIX timestamp in seconds when the access-token will expire
  iat:
  description: The UNIX timestamp in seconds when the access-token was originally issued
  type: number
  owner:
  type: string
  format: uri
  description: 'A link to the resource that owns the token (currently, this is always a user)'
  organization:
  type: string
  format: uri
  example: 'https://api.calendly.com/organizations/EBHAAFHDCAEQTSEZ'
  description: A link to the owner's current organization
  required: - active
  examples:
  Example - Active token:
  value:
  active: true
  scope: default
  client_id: '123'
  token_type: Bearer
  exp: 1601325434
  iat: 1601318234
  owner: 'https://api.calendly.com/users/EBHAAFHDCAEQTSEZ'
  organization: 'https://api.calendly.com/organizations/EBHAAFHDCAEQTSEZ'
  Example - Inactive token:
  value:
  active: false
  '400':
  $ref: '#/components/responses/InvalidRequest'
  '401':
  $ref: '#/components/responses/ErrorResponse'
  description: Use this endpoint to introspect an access/refresh token.
  requestBody:
  required: true
  content:
  application/x-www-form-urlencoded:
  schema:
  type: object
  properties:
  client_id:
  type: string
  description: The ID provided by Calendly for the web application
  client_secret:
  type: string
  description: The secret provided by Calendly
  token:
  type: string
  description: The access/refresh token provided by Calendly
  required: - client_id - client_secret - token
  examples:
  Example:
  value:
  client_id: '123'
  client_secret: '456'
  token: abc
  tags: - OAuth
  parameters: - schema:
  type: string
  enum: - application/x-www-form-urlencoded
  default: application/x-www-form-urlencoded
  in: header
  name: Content-Type
  required: true
  description: Indicates the media type of the resource
  components:
  schemas:
  webTokenRequestWithCode:
  allOf: - type: object
  x-sl-internally-excluded: true
  x-sl-error-message: You do not have permission to view this reference - type: object
  description: Token request for web apps using authorization code
  properties:
  grant_type:
  type: string
  enum: - authorization_code
  description: The method used to retrieve an access token
  code:
  type: string
  description: The authorization code from an OAuth response
  redirect_uri:
  type: string
  description: The redirect URI. Note this must be the same as the **redirect_uri** passed in the authorization request.
  format: uri
  example: 'https://my.site.com/auth/calendly'
  required: - grant_type - code - redirect_uri
  title: Web Token Request with Authorization Code
  description: The Authorization Code token request for web apps.
  webTokenRequestWithRefreshToken:
  allOf: - type: object
  x-sl-internally-excluded: true
  x-sl-error-message: You do not have permission to view this reference - type: object
  description: Token request for web apps using refresh token
  properties:
  grant_type:
  type: string
  enum: - refresh_token
  description: The method used to retrieve an access token
  refresh_token:
  type: string
  description: The refresh token received from previous access token requests. This is used for the refresh_token grant type.
  required: - grant_type - refresh_token
  title: Web Token Request with Refresh Token
  description: The Refresh Token request for a token for web apps.
  nativeTokenRequestWithCode:
  allOf: - type: object
  x-sl-internally-excluded: true
  x-sl-error-message: You do not have permission to view this reference - type: object
  description: Token request for native apps using authorization code
  properties:
  client_id:
  type: string
  description: The ID provided by Calendly for the web application
  grant_type:
  type: string
  enum: - authorization_code
  description: The method used to retrieve an access token
  code:
  type: string
  description: The authorization code from an OAuth response
  redirect_uri:
  type: string
  description: The redirect URI. Note this must be the same as the **redirect_uri** passed in the authorization request.
  format: uri
  example: 'https://my.site.com/auth/calendly'
  code_verifier:
  type: string
  description: The code verifier generated during the authorization request
  required: - client_id - client_secret - grant_type - code - redirect_uri - code_verifier
  title: Native Token Request with Code Verifier
  nativeTokenRequestWithRefreshToken:
  allOf: - type: object
  x-sl-internally-excluded: true
  x-sl-error-message: You do not have permission to view this reference - type: object
  description: Token request for native apps using refresh token
  properties:
  client_id:
  type: string
  description: The ID provided by Calendly for the web application
  grant_type:
  type: string
  enum: - refresh_token
  description: The method used to retrieve an access token
  refresh_token:
  type: string
  description: The refresh token received from previous access token requests. This is used for the refresh_token grant type.
  required: - client_id - client_secret - grant_type - refresh_token
  title: Native Token Request with Refresh Token
  description: The Refresh Token request for a token for native apps.
  tokenResponse:
  type: object
  title: Token Response
  description: OAuth token response
  properties:
  token_type:
  type: string
  enum: - Bearer
  description: The token type (currently this is always "Bearer")
  access_token:
  type: string
  description: The access token provided in the response
  refresh_token:
  type: string
  description: The refresh token provided in the response
  scope:
  type: string
  description: The scope of the access request
  created_at:
  type: number
  description: The UNIX timestamp in seconds when the event was created
  expires_in:
  type: number
  description: The number of seconds until the access token expires
  owner:
  type: string
  description: 'A link to the resource that owns the token (currently, this is always a user)'
  format: uri
  example: 'https://api.calendly.com/users/EBHAAFHDCAEQTSEZ'
  organization:
  type: string
  format: uri
  example: 'https://api.calendly.com/organizations/EBHAAFHDCAEQTSEZ'
  description: A link to the owner's current organization
  required: - token_type - access_token - refresh_token - created_at - expires_in - owner - organization
  x-examples:
  Example:
  token_type: Bearer
  expires_in: 7200
  created_at: 1548689183
  refresh_token: b77a76ffce83d3bc20531ddfa76704e584f0ee963f6041b8bfc70c91373267d5
  access_token: eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNjMxNzI3Nzk5LCJqdGkiOiI5ZmViM2I0Zi04Njk1LTQzZjgtYWJhMS1kNDRiM2I5ZDdjYzEiLCJ1c2VyX3V1aWQiOiJCR0hIREdGREdIQURCSEoyIiwiYXBwX3VpZCI6IkppNzY5UjZ6eTZzSVN4X3I0OWRmZ0VsN0NPazVmeFVadVA0eHBadFlPbUkiLCJleHAiOjE2MzE3MzQ5OTl9.CrVBOFsqLjyfPK2E834E3sJv3fKU-PPlaNXQQB80Deo
  scope: default
  owner: 'https://api.calendly.com/users/EBHAAFHDCAEQTSEZ'
  organization: 'https://api.calendly.com/organizations/EBHAAFHDCAEQTSEZ'
  errorResponse:
  title: Error Response
  description: OAuth error response
  type: object
  properties:
  error:
  type: string
  enum: - invalid_client - unauthorized_client
  description: Error code
  error_description:
  type: string
  description: Error description
  required: - error - error_description
  x-examples:
  Example:
  error: invalid_client
  error_description: 'Client authentication failed due to unknown client, no client authentication included, or unsupported authentication method.'
  securitySchemes:
  basicAuth:
  type: http
  scheme: basic
  description: Use `client_id` for username and `client_secret` for password.
  oauth2:
  type: oauth2
  flows:
  authorizationCode:
  authorizationUrl: /oauth/authorize
  tokenUrl: /oauth/token
  refreshUrl: /oauth/token
  scopes: {}
  responses:
  TokenResponse:
  description: OK
  content:
  application/json:
  schema:
  $ref: '#/components/schemas/tokenResponse'
  examples:
  Example:
  value:
  token_type: Bearer
  expires_in: 7200
  created_at: 1548689183
  refresh_token: b77a76ffce83d3bc20531ddfa76704e584f0ee963f6041b8bfc70c91373267d5
  access_token: eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNjMxNzI3Nzk5LCJqdGkiOiI5ZmViM2I0Zi04Njk1LTQzZjgtYWJhMS1kNDRiM2I5ZDdjYzEiLCJ1c2VyX3V1aWQiOiJCR0hIREdGREdIQURCSEoyIiwiYXBwX3VpZCI6IkppNzY5UjZ6eTZzSVN4X3I0OWRmZ0VsN0NPazVmeFVadVA0eHBadFlPbUkiLCJleHAiOjE2MzE3MzQ5OTl9.CrVBOFsqLjyfPK2E834E3sJv3fKU-PPlaNXQQB80Deo
  scope: default
  owner: 'https://api.calendly.com/users/EBHAAFHDCAEQTSEZ'
  organization: 'https://api.calendly.com/organizations/EBHAAFHDCAEQTSEZ'
  ErrorResponse:
  description: Unauthorized
  content:
  application/json:
  schema:
  $ref: '#/components/schemas/errorResponse'
  examples:
  Example:
  value:
  error: invalid_client
  error_description: 'Client authentication failed due to unknown client, no client authentication included, or unsupported authentication method.'
  InvalidRequest:
  description: Bad Request
  content:
  application/json:
  schema:
  type: object
  properties:
  error:
  type: string
  enum: - invalid_request
  description: Error code
  error_description:
  type: string
  description: Error description
  required: - error - error_description
  examples:
  Example:
  value:
  error: invalid_request
  error_description: 'The request is missing a required parameter, includes an unsupported parameter value, or is otherwise malformed.'
