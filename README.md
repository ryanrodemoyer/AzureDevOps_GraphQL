# AzureDevOps_GraphQL
GraphQL facade over the Azure DevOps REST api.

## Get Started
1. Get a Personal Access Token (PAT) from your Azure DevOps instance.
1. Fix the routes in `index.ts` to use your Azure DevOps instance.
1. Run TypeScript to generate `index.js`.  
`tsc index.js`
1. Run NodeJS to start the local GraphQL server.  
`PAT=ado_token node index.js`
1. The app should be available at `http://localhost:4000/graphql`.

## To Do
1. Fix the routes to reference not my personal ADO instance : )