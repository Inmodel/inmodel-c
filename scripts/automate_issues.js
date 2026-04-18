const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BUILD_STATUS_PATH = path.join(__dirname, '../BUILD_STATUS.md');
const GH_PATH = '/opt/homebrew/bin/gh';
const COMPONENT_MAPPING = {
    'Smart Contract': '[Blockchain]',
    'Backend': '[Backend]',
    'Dashboard': '[Frontend]',
    'CLI': '[CLI]'
};

function runGh(args) {
    try {
        return execSync(`${GH_PATH} ${args}`, { encoding: 'utf8' }).trim();
    } catch (error) {
        console.error(`GH Command Failed: ${GH_PATH} ${args}`);
        console.error(error.message);
        return null;
    }
}

function parseBuildStatus() {
    const content = fs.readFileSync(BUILD_STATUS_PATH, 'utf8');
    const sections = {};
    let currentSection = null;

    const lines = content.split('\n');
    for (const line of lines) {
        const headerMatch = line.match(/^### (?:✅ |)(.+)/);
        if (headerMatch) {
            currentSection = headerMatch[1].trim();
            // Handle cases like "Smart Contract (programs/judgechain/src/lib.rs)"
            currentSection = currentSection.split('(')[0].trim();
            sections[currentSection] = [];
            continue;
        }

        if (currentSection && line.trim().startsWith('- [')) {
            const taskMatch = line.match(/- \[([ x])\] (.*)/);
            if (taskMatch) {
                sections[currentSection].push({
                    completed: taskMatch[1] === 'x',
                    text: taskMatch[2].trim()
                });
            }
        }
    }
    return sections;
}

function getExistingIssues() {
    const output = runGh('issue list --state open --json number,title,body');
    if (!output) return [];
    return JSON.parse(output);
}

function sync() {
    console.log('--- Starting Issue Sync ---');
    const localSections = parseBuildStatus();
    const remoteIssues = getExistingIssues();

    // Map local sections to remote issues
    for (const [sectionName, tasks] of Object.entries(localSections)) {
        const tag = COMPONENT_MAPPING[sectionName];
        if (!tag && sectionName !== 'Low Priority') continue;

        let issue = remoteIssues.find(i => i.title.includes(tag));
        
        if (sectionName === 'Low Priority') {
            // For low priority, we create individual issues for each task
            for (const task of tasks) {
                if (task.completed) continue;
                
                // Check if already has an issue reference in text
                if (task.text.includes('(#')) continue;

                console.log(`Creating individual issue for: ${task.text}`);
                const res = runGh(`issue create --title "${task.text}" --body "Tracked from BUILD_STATUS.md Low Priority tasks." --label "enhancement"`);
                if (res) {
                    const issueNumber = res.match(/[0-9]+$/)[0];
                    console.log(`Created issue #${issueNumber}`);
                    // Update BUILD_STATUS.md (Note: This simple script doesn't write back yet to avoid complexity, but usually we would)
                }
            }
            continue;
        }

        if (issue) {
            console.log(`Syncing tasks for ${sectionName} -> Issue #${issue.number}`);
            // Logic to update issue body if needed
            // For now, we'll just ensure the issue body contains all the tasks
            let updatedBody = issue.body;
            let needsUpdate = false;

            tasks.forEach(task => {
                const checkedStr = task.completed ? '[x]' : '[ ]';
                // Check if the task text (ignoring checkboxes) is in the body
                const escapedText = task.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const taskRegex = new RegExp(`\\[([ x])\\]\\s*${escapedText}`, 'i');
                
                const match = updatedBody.match(taskRegex);
                if (!match) {
                    // Task missing from issue body
                    if (updatedBody.includes('### Tasks')) {
                        updatedBody = updatedBody.replace('### Tasks', `### Tasks\n- ${checkedStr} ${task.text}`);
                    } else {
                        updatedBody += `\n\n### Tasks\n- ${checkedStr} ${task.text}`;
                    }
                    needsUpdate = true;
                } else if (match[1] === ' ' && task.completed) {
                    // Task marked as complete locally but not on remote
                    updatedBody = updatedBody.replace(match[0], `[x] ${task.text}`);
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                console.log(`Updating body for Issue #${issue.number}...`);
                const tempFile = path.join(__dirname, '../.temp_issue_body.md');
                fs.writeFileSync(tempFile, updatedBody);
                runGh(`issue edit ${issue.number} --body-file "${tempFile}"`);
                fs.unlinkSync(tempFile);
            }
        }
    }
    console.log('--- Sync Complete ---');
}

sync();
