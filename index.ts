var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
import axios from 'axios';
import { GraphQLSchema, GraphQLObjectType, GraphQLList, GraphQLID, GraphQLString, GraphQLInt } from 'graphql';

// EXAMPLE
// 1. get a personal access token from Azure DevOps
// 2. run TypeScript to generate index.js
// `tsc index.js`
// 3. run NodeJS to start the local GraphQL server
// `PAT=ado_token node index.js` 

const token: String = process.env.PAT;
const auth: String = Buffer.from(`:${token}`).toString('base64');

axios.defaults.headers.common['Authorization'] = `Basic ${auth}`;

const __DEBUG: boolean = true;

const log = (content) => {
    if (__DEBUG.valueOf() === true) {
        console.log(content);
    }
}

const getProjects = projectId => {
    log('getProjects');

    // this supports getting all projects or a single project
    // the flag to determine is if the `projectId` value is undefined
    // ADO api returns either an array of projects or a single project object
    // our method here needs to always return a collection

    let url = `https://ryanrodemoyer.visualstudio.com/_apis/projects`;
    if (projectId) {
        url += `/${projectId}?api-version=5.1`;

        log(`GET ${url}`);

        return axios.get(url)
            .then(res => {
                log(res.data);
                return res.data;
            })
            .then(data => {
                return new Array(data);
            });
    } else {
        url += '?api-version=5.1';

        log(`GET ${url}`);

        return axios.get(url)
            .then(res => {
                log(res.data);
                return res.data;
            })
            .then(data => data.value);
    }
};

const getRepositoriesFromProject = project => {
    log('getRepositoriesFromProject');

    log('project');
    log(project);

    const url = `https://ryanrodemoyer.visualstudio.com/${project.id}/_apis/git/repositories?api-version=5.1`;
    log(`GET ${url}`);

    return axios.get(url)
        .then(res => {
            log('results');
            log(res.data);
            return res.data;
        })
        .then(data => {
            // transform each object to include data from the current node (source)
            return data.value.map(x => {
                return {
                    ...x,
                    projectId: project.id,
                }
            })
        });
};

const getRefsFromRepository = (source) => {
    log('getRefsFromRepository');
    log('source');
    log(source);

    const url = `https://ryanrodemoyer.visualstudio.com/${source.projectId}/_apis/git/repositories/${source.id}/refs?api-version=5.1`;
    log(`GET ${url}`);

    return axios.get(url)
        .then(res => {
            log(res.data);
            return res.data;
        })
        .then(data => {
            // transform each object to include data from the current node (source)
            return data.value.map(x => {
                return {
                    projectId: source.projectId,
                    repositoryId: source.id,
                    ...x
                }
            })
        });
};

const getPushesFromRepository = (source) => {
    log('getPushesFromRepository');
    log('source');
    log(source);

    let url;

    if (source.id) {
        // if the incoming data has an `id` property, then we want pushes for the repository
        url = `https://ryanrodemoyer.visualstudio.com/${source.projectId}/_apis/git/repositories/${source.id}/pushes?api-version=5.1`;
    } else if (source.repositoryId && source.name) {
        // if we have the `repositoryId` property then we want pushes for a specific ref
        url = `https://ryanrodemoyer.visualstudio.com/${source.projectId}/_apis/git/repositories/${source.repositoryId}/pushes?searchCriteria.refName=${source.name}&api-version=5.1`;
    }

    log(`GET ${url}`);

    return axios.get(url)
        .then(res => {
            log(res.data);
            return res.data;
        })
        .then(data => data.value);
};

const pushType = new GraphQLObjectType({
    name: 'PushType',
    fields: () => ({
        pushId: {
            type: GraphQLInt
        },
        date: {
            type: GraphQLString
        },
        pushedBy: {
            type: creatorType
        }
    })
});

const creatorType = new GraphQLObjectType({
    name: 'CreatorType',
    fields: () => ({
        id: {
            type: GraphQLID,
        },
        displayName: {
            type: GraphQLString
        },
        uniqueName: {
            type: GraphQLString
        }
    })
});

const refType = new GraphQLObjectType({
    name: 'RefType',
    fields: () => ({
        objectId: {
            type: GraphQLID,
        },
        name: {
            type: GraphQLString
        },
        creator: {
            type: creatorType
        },
        pushes: {
            type: GraphQLList(pushType),
            resolve: source => getPushesFromRepository(source)
        }
    })
});

const repositoryType = new GraphQLObjectType({
    name: 'RepositoryType',
    fields: () => ({
        id: {
            type: GraphQLID,
        },
        name: {
            type: GraphQLString
        },
        refs: {
            type: GraphQLList(refType),
            resolve: (source, args, context, info) => {
                log("source");
                log(source);

                return getRefsFromRepository(source);
            }
        },
        pushes: {
            type: GraphQLList(pushType),
            resolve: (source) => getPushesFromRepository(source)
        }
    })
});

const projectType = new GraphQLObjectType({
    name: 'ProjectType',
    fields: () => ({
        id: {
            type: GraphQLID,
        },
        name: {
            type: GraphQLString
        },
        repositories: {
            type: GraphQLList(repositoryType),
            resolve: project => getRepositoriesFromProject(project)
        }
    })
});

const queries = new GraphQLObjectType({
    name: 'AzureDevOpsQuery',
    fields: () => ({
        projects: {
            type: GraphQLList(projectType),
            args: {
                projectId: {
                    type: GraphQLString
                }
            },
            resolve: (_source, { projectId }) => getProjects(projectId)
        }
    })
});

var schema = new GraphQLSchema({
    query: queries
});

var app = express();
app.use('/graphql', graphqlHTTP({
    schema: schema,
    graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');