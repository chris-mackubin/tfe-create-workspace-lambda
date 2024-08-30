const https = require('https');

exports.handler = async(event) => {

    const ws_name = event.name;

    try {
        console.log("Creating Workspace...");

        console.log("event: " + JSON.stringify(event));

        const result = await createTFEWorkspace(ws_name);
        const objResult = JSON.stringify((result));
        console.log("response: " + objResult);
        const workspaceId = JSON.parse(objResult).data.id;
        console.log("Workspace created - Id: ", result.data.id);

        const planResult = await applyPermissionTFEWorkspace(workspaceId, 'team-nTTaWeYqrPs3zVFv', 'plan');
        console.log('Team Access added: ', planResult);
        const applyResult = await applyPermissionTFEWorkspace(workspaceId, 'team-kcAGs5qGASJHEdyG', 'write');
        console.log('Team Access added: ', applyResult);

        return {
            statusCode: 201,
            headers: {'Content-Type': 'application/json'},
            workspaceId: result.data.id,
        };

    } catch (error) {
        console.log('Error is: 👉️', error);
        const err = {
            statusCode: 400,
            body: "Error while attempting to create workspace " + ws_name,
        };
        throw JSON.stringify(err);
    }

};

function createTFEWorkspace(name) {

    const body = '{"data": { "attributes": { "execution-mode": "local" }, "type": "workspaces" }}';
    let objBody = JSON.parse(body);
    objBody.data.attributes.name = name;
    let postBody = JSON.stringify(objBody);

    const options = {
        hostname: process.env.tfeDomain,
        path: '/api/v2/organizations/' + process.env.tfeOrganization + '/workspaces',
        method: 'POST',
        port: 443,
        headers: {
            'Content-Type': 'application/vnd.api+json',
            'Content-Length': postBody.length,
            'Authorization': 'Bearer ' + process.env.tfeToken
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {

            let rawData = '';
            res.on('data', chunk => {
                rawData += chunk;
            });

            console.log("statusCode from terraform.io: ", res.statusCode);
            res.on('end', () => {
                try {
                    if (res.statusCode > 299) {
                        reject("statusCode: " + res.statusCode + " - Problem creating workspace on terraform.io." + "\n" + rawData);
                    }
                    else {
                        resolve(JSON.parse(rawData));
                    }
                } catch (err) {
                    reject(new Error(err));
                }
            });
        });

        req.on('error', err => {
            reject(new Error(err));
        });

        req.write(postBody);
        req.end();
    });
}

function applyPermissionTFEWorkspace(workspace_id, team_id, access_lvl) {

    const body = '{ "data": { "attributes": {}, "relationships": { "workspace": { "data": { "type": "workspaces" }}, "team": { "data": { "type": "teams" }}}, "type": "team-workspaces" }}';
    let objBody = JSON.parse(body);
    objBody.data.relationships.workspace.data.id = workspace_id;
    objBody.data.relationships.team.data.id = team_id;
    objBody.data.attributes.access = access_lvl;
    let postBody = JSON.stringify(objBody);

    const options = {
        hostname: process.env.tfeDomain,
        path: '/api/v2/team-workspaces',
        method: 'POST',
        port: 443,
        headers: {
            'Content-Type': 'application/vnd.api+json',
            'Content-Length': postBody.length,
            'Authorization': 'Bearer ' + process.env.tfeToken
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let rawData = '';

            res.on('data', chunk => {
                rawData += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(rawData));
                } catch (err) {
                    reject(new Error(err));
                }
            });
        });

        req.on('error', err => {
            reject(new Error(err));
        });

        req.write(postBody);
        req.end();
    });
}