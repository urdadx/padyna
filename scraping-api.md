# CRAWL ENDPOINT

curl --request POST \
 --url https://scraper.padyna.com/v2/crawl \
 --header 'Content-Type: application/json' \
 --data '{
"sitemap": "include",
"crawlEntireDomain": false,
"includePaths": [
"<string>" // URL pathname regex patterns to include in the crawl
],
"limit": 10,
"webhook": {
"url": "<string>",
"headers": {},
"metadata": {},
"events": [
"completed"
]
},
"scrapeOptions": {
"onlyMainContent": false,
"maxAge": 172800000,
"formats": [
"markdown"
]
}
}'

# CRAWL ENDPOINT RESPONSE

{
"success": true,
"id": "<string>",
"url": "<string>"
}

# GET CRAWL STATUS

curl --request GET \
 --url https://scraper.padyna.com/v2/crawl/{id} \

# GET CRAWL STATUS RESPONSE

{
"status": "<string>",
"total": 123,
"completed": 123,
"creditsUsed": 123,
"expiresAt": "2023-11-07T05:31:56Z",
"next": "<string>",
"data": [
{
"markdown": "<string>",
"html": "<string>",
"rawHtml": "<string>",
"links": [
"<string>"
],
"screenshot": "<string>",
"metadata": {
"title": "<string>",
"description": "<string>",
"language": "<string>",
"sourceURL": "<string>",
"url": "<string>",
"keywords": "<string>",
"ogLocaleAlternate": [
"<string>"
],
"<any other metadata> ": "<string>",
"statusCode": 123,
"error": "<string>"
}
}
]
}

# CANCEL CRAWL

curl --request DELETE \
 --url https://api.firecrawl.dev/v2/crawl/{id} \

# CANCEL CRAWL RESULT

{
"status": "cancelled"
}

# GET CRAWL ERRORS

curl --request GET \
 --url https://api.firecrawl.dev/v2/crawl/{id}/errors \

# GET CRAWL ERRORS RESPONSE

{
"errors": [
{
"id": "<string>",
"timestamp": "<string>",
"url": "<string>",
"error": "<string>"
}
],
"robotsBlocked": [
"<string>"
]
}

# GET ACTIVE CRAWLS

curl --request GET \
 --url https://api.firecrawl.dev/v2/crawl/active \

# GET ACTIVE CRAWLS RESPONSE

{
"success": true,
"crawls": [
{
"id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
"teamId": "<string>",
"url": "<string>",
"options": {
"scrapeOptions": {
"formats": [
"markdown"
],
"onlyMainContent": true,

"maxAge": 172800000,
"minAge": 123,
"waitFor": 0,
"mobile": false,
"skipTlsVerification": true,
"timeout": 30000,
"parsers": [
"pdf"
],

"removeBase64Images": true,
"blockAds": true,
"proxy": "auto",
"storeInCache": true
}
}
}
]
}

# CRAWL WEBHOOK

You can configure webhooks to receive real-time notifications as your crawl progresses. This allows you to process pages as they are scraped instead of waiting for the entire crawl to complete.
curl -X POST https://api.firecrawl.dev/v2/crawl \
 -H 'Content-Type: application/json' \
 -d '{
"url": "https://scraper.padyna.com",
"limit": 100,
"webhook": {
"url": "https://your-domain.com/webhook",
"metadata": {
"any_key": "any_value"
},
"events": ["started", "page", "completed"]
}
}'

# WEBHOOK EVENT TYPES

crawl.started ---> Fires when the crawl begins
crawl.page ----> Fires for each page successfully scraped
crawl.completed ----> Fires when the crawl finishes
crawl.failed ---> Fires if the crawl encounters an error

# WEBHOOK PAYLOAD

{
"success": true,
"type": "crawl.page",
"id": "crawl-job-id",
"data": [...], // Page data for 'page' events
"metadata": {}, // Your custom metadata
"error": null
}

# SCRAPE A SINGLE PAGE

curl --request POST \
 --url https://scraper.urdadx.com/v2/scrape \
 --header 'Content-Type: application/json' \
 --data '{
"onlyMainContent": false,
"maxAge": 172800000,
"formats": [
"markdown"
]
}'

# SCRAPING RESULTS

{
"success": true,
"data": {
"markdown": "<string>",
"summary": "<string>",
"links": [
"<string>"
],

    "metadata": {
      "title": "<string>",
      "description": "<string>",
      "language": "<string>",
      "sourceURL": "<string>",
      "<any other metadata> ": "<string>",
      "statusCode": 123,
      "error": "<string>"
    },
    "warning": "<string>",

}
}

# MAP A URL

curl --request POST \
 --url https://scraper.padyna.com/v2/map \
 --header 'Content-Type: application/json' \
 --data '
{
"url": "<string>",
"search": "<string>",
"sitemap": "include",
"includeSubdomains": true,
"ignoreQueryParameters": true,
"ignoreCache": false,
"limit": 5000,
"location": {
"country": "US",
"languages": [
"en-US"
]
},
"timeout": 60000
}
'

# MAP URL RESULTS

{
"success": true,
"links": [
{
"url": "<string>",
"title": "<string>",
"description": "<string>"
}
]
}
