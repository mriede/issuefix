const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./issuefix.db');
const app = express();

const apiUrl = "https://api.github.com"

function requestWithUserAgent(url, cb) {
    request({ url: url,
              headers: {'User-Agent': 'request'}}, cb)
              .auth('Issuefix', 'YcQbNMCkYMhcZUtfLm5Qjj8o8zjg67');
}

function addRepo(repo) {
    try {
        db.run(`INSERT INTO projects (project_name) VALUES($1);`, [repo.full_name], (err, row) => {
            console.log('Added Repo: ' + repo.full_name)
            return
        });
    } catch(err) {
        console.log(err)
        return
    }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomProject(res, rows, cb) {
    if (rows.length < 1) {
        res.send('No more issues! The world is finally at peace again!')
        return
    }

    let rand = getRandomInt(0, rows.length)
    let project = rows[rand]
    cb(project)
}

function getRandomIssue(res, rows, cb) {
    getRandomProject(res, rows, (project) => {
        console.log('Getting Issues for Project: ' + project.project_name)
        requestWithUserAgent(apiUrl + `/repos/${project.project_name}/issues?state=open`, (error, response, body) => {
            let issues = JSON.parse(body)
            if (issues.length < 1) {
                console.log('Removing: ' + project.project_name)

                rows.splice(rows.indexOf(project), 1)
                getRandomIssue(res, rows, cb)
            } else {
                let issue = JSON.stringify(issues[getRandomInt(0, issues.length)])
                cb(issue)
                return
            }  
        });
    });
}

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/issue', (req, res) => {
    db.all('SELECT * FROM projects', (err, rows) => {
        getRandomIssue(res, rows, (issue) => {
            res.send(issue)
        });
    });
});

app.get('/add/user/:user', (req, res) => {
    requestWithUserAgent(apiUrl + `/users/${req.params.user}/repos`, (error, response, body) => {
        if (response.statusCode === 404) {
            res.send('User not Found: ' + req.params.user)
        } else {
            let repos = JSON.parse(body)
            repos.forEach(addRepo)

            res.send('User Added!')
            console.log('Added User: ' + req.params.user)
            return
        }
    });
});

app.get('/add/repo/:user/:repo', (req, res) => {
    requestWithUserAgent(apiUrl + `/repos/${req.params.user}/${req.params.repo}`, (error, response, body) => {
         if (response.statusCode === 404) {
            res.send('Repo not Found: ' + `${req.params.user}/${req.params.repo}`)
         } else {
            addRepo(JSON.parse(body))
            res.send('Repo Added!')
            return
         }
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log('# Issuefix Server Started')
});