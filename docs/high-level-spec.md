# Vibe Coding Accelerator

## Overview
The purpose of the Vibe Coding Accelerator is to help users quickly create custom instructions for their specific AI Coding tool, adhere to best practices, and specific development environment requirements.

For the POC, this will be a standalone node project that exposes an Angular frontend.
 - Users will checkout the project from git and run it locally
    - Because it is run locally there is no need for a login or authentication
    - Since this is meant to help set up the AI Config for a coding environment, this should be focused on Desktop only.  No mobile support.  It should work with Safari, Chrome, & Edge.
 - Since this will require an LLM, we'll need to prompt the user for an OpenAPI endpoint and an optional API key.  
    - This should be stored in their .env file
    - Once added, don't prompt the user for it again
    - When added, the OpenAPI endpoint and API key should also immediately take effect
    - When adding or editing the OpenAPI endpoint and/or API key, there should be a "Test Access" button to validate that the endpoint and the optional API key provides access to an LLM following the OpenAPI protocol.
 - Users should be able to create/view/edit/delete projects.    
    - Projects will have a name
    - Files can be added to the project
    - Users can select tech stacks for each project
    - Users can export a customized set of instructions for their project to help guide their AI Coding Agent

- AI Agent Configs:
    - There will be an "ai_agents" directory
    - the "ai_agents" directory will have subdirectories for each supported AI Agent in camel case.  
        - these will contain the necessary customization files for that AI Agent

- Projects:
    - Will be stored in the ./projects directory
    - Each project is a subdirectory where the directory name is the project name in lowercase & camel case.  Because of this, duplicate project names are not allowed.
    - When projects are shown in the UI, it will explode the camel-case to spaces and capitalize the first letter of each word
    - Each project directory will have a "files" subdirectory where the user can upload documents about the architecture, coding conventions, etc.  
    - Each project will have a "techstack.txt" file that contains the tech stack details for the project, with one tech stack element per line.
    - When a project is deleted the directory is renamed to add a '.deleted' extension, it is not deleted from the disk

- Main UI:
    - The main UI will have a sortable & searchable tile view of projects
    - Deleted projects will not be shown in the list
    - There will be a settings icon that allows the user to edit their OpenAPI endpoint and API key
    - There is be a "+" icon to add a new project
    - By default, projects are be ordered by creation time with the most recent being first, but they can resort it alphabetically
    - Clicking on a project tile takes you into the view/edit mode for the project
    - There is a delete icon both on each project tile. Deleting a project requires confirmation.

- Projects View/Edit Page:
    - User's should be able to rename their project, if the proposed new name has a collision with another existing project, the user should be warned that another project already exists with that name and be prevented from completing the renaming.
    - There will be a select box to select their chosen AI Agent.
        - The subdirectories of the "ai_agents" directory will be the list of agents options for the dropbox
        - The dropbox explodes the camel-cased directory name to spaces and capitalize the first letter
    - There will be a "Generate AI Agent Config" button
    - There will be a Delete Icon to delete the project. Deleting a project requires confirmation. If confirmed, it redirects the user back to the main page.
    - There will be a tech stack section:
        - It has an autocomplete field that shows known tech stack elements that can be added.  
        - When added that tech stack item should show up as a chip in the tech stack section with an "x" that the user can click to remove.
        - The tech stack selection is driven by the "AI Agent" selection, which will map to the "ai_agents/<selected-ai-agent>/instructions" directory.  This directory will contain the tech stack files.  The tech stack files are identified by the following pattern tech-<tech-stack-name>.instructions.md.
    - If the project has been procesed by the LLM, it should display the completeness score
    - There will be a documents section:
        - For the documents section, we want users to be able to drag and drop files into the documents area for each upload.
        - There will be an add file button that allows the user to add one or more files at a time.
        - Supported file types for upload are (txt, md, yml, html, and pdf)
        - Uploaded files will be copied into the project's "files" subdirectory.  
        - Users should see a tile view of each file.  
            - Clicking on a file will show the file in the browser for browser viewable file types.
                - Supported file types are (txt, md, yml, html, and pdf)

- "Generate AI Agent Config"
    - Based on the selected Agent and Tech stack selection, the relevant files are copied from the "ai_agents/<agent-name>" directory to the project's "export" directory.
    - Each AI Agent file is submitted to the LLM along with the documents with instructions to:
        - For this file, look at the documents and add items that are missing, remove or update items that conflict so that the instructions in this file adhere to the guidelines provided.
    - After all of the files have been processed, the "export" directory is zipped, and provided as a download through the UI as a link.
    - In addition to the zip file a traceability report should be generated that shows the various apects of the tech stack and rules and help the user identify potentially missing guidelines.  Missing documents will impact the completeness score for the project.  A project that has all related guidelines will have a completeness score of 100.
