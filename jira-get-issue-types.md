Returns issue types for a project.

This operation can be accessed anonymously.

# SAMPLE REQUEST

curl --request GET \
 --url 'https://your-domain.atlassian.net/rest/api/3/issuetype/project?projectId={projectId}' \
 --user 'email@example.com:<api_token>' \
 --header 'Accept: application/json'

# SAMPLE RESPONSE

[{"avatarId":10002,"description":"A problem with the software.","entityId":"9d7dd6f7-e8b6-4247-954b-7b2c9b2a5ba2","hierarchyLevel":0,"iconUrl":"https://your-domain.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10316&avatarType=issuetype\",","id":"1","name":"Bug","scope":{"project":{"id":"10000"},"type":"PROJECT"},"self":"https://your-domain.atlassian.net/rest/api/3/issueType/1","subtask":false},{"avatarId":1,"description":"A task that needs to be done.","hierarchyLevel":0,"iconUrl":"https://your-domain.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10299&avatarType=issuetype\",","id":"3","name":"Task","scope":{"project":{"id":"10000"},"type":"PROJECT"},"self":"https://your-domain.atlassian.net/rest/api/3/issueType/3","subtask":false}]
