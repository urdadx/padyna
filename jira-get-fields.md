# Get create metadata issue types for a project

Returns a page of issue type metadata for a specified project. Use the information to populate the requests in Create issue and Create issues.

# SAMPLE REQUEST

curl --request GET \
 --url 'https://your-domain.atlassian.net/rest/api/3/issue/createmeta/{projectIdOrKey}/issuetypes' \
 --user 'email@example.com:<api_token>' \
 --header 'Accept: application/json'

# SAMPLE RESPONSE

{"issueTypes":[{"description":"An error in the code","iconUrl":"https://your-domain.atlassian.net/images/icons/issuetypes/bug.png","id":"1","name":"Bug","self":"https://your-domain.atlassian.net/rest/api/3/issueType/1","subtask":false}],"maxResults":1,"startAt":0,"total":1}
