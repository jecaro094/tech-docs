---
title: 📝 Template
tagline: Full-stack app with React, FastAPI, Docker & AWS
---

# Template

A reusable landing-page template showcasing a modern full-stack architecture: a
Python async backend, a React frontend, containerised deployment, and cloud
infrastructure.

## Context

![PokeAPI logo](/tech-docs/docs/PokeAPI.webp)

This project is an API that pulls data from the public Pokémon REST API
([https://pokeapi.co](https://pokeapi.co)) to show different stats for your
favourite Pokémon.

With this custom Pokédex you can filter Pokémon by name and check their stats
with a single click on the chosen Pokémon.

It's a simple but stylish way to see how different technologies can come together
to build a fun Pokédex. The same approach also applies to real-world cases:
building companion apps, creating interactive dashboards, or teaching beginners
how to work with APIs in an engaging way.

:::note
For now we've kept it simple by using only the PokeAPI REST API, but the system
can easily grow by adding more data and features in the future.
:::

## Features

- **FastAPI backend** — async Python API with automatic docs, type validation,
  and high performance.
- **React frontend** — interactive UI with charts for stats visualisation and
  paginated data tables.
- **Docker containers** — fully containerised: database, backend, frontend, and
  an Nginx reverse proxy.
- **AWS deployment** — deployed on Elastic Beanstalk with automated CI/CD via
  GitHub Actions.
- **Authentication** — secure endpoints with user authentication and protected
  routes.
- **Data visualisation** — interactive graphs and tables with real-time
  filtering and pagination.

## Code example

```python
import httpx
from fastapi import FastAPI, HTTPException

app = FastAPI()
POKEAPI_BASE = "https://pokeapi.co/api/v2"

@app.get("/pokemon/{name}")
async def get_pokemon(name: str):
    """Fetch basic Pokemon data from the public PokeAPI."""
    async with httpx.AsyncClient() as client:
        url = POKEAPI_BASE + "/pokemon/" + name.lower()
        resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(404, "Pokemon not found")
        data = resp.json()
        return {
            "name": data["name"],
            "id": data["id"],
            "height": data["height"],
            "weight": data["weight"],
            "types": [t["type"]["name"] for t in data["types"]],
        }
```

```bash
npm install dev
```

## Tech stack

| Area | Details |
|---|---|
| React frontend | Graphs for displaying stats; tables with pagination connected to the database |
| Python backend | FastAPI framework; authentication; Unit of Work pattern for DB operations; DTOs & database models |
| Docker | Separate containers for database, Nginx, frontend and backend |
| AWS | Elastic Beanstalk for deployment |
| GitHub | Secrets, workflows for automated AWS deployment, version control |

## FAQ

**What is this project about?** An interactive Pokédex that pulls data from the
public PokeAPI REST service. It shows how React, FastAPI, Docker and AWS can come
together into a fun, functional application.

**Can I use this as a template?** Yes. The architecture is designed to be
reusable: swap the API source, change the data models, and you have a solid
full-stack foundation for any data-driven application.

**How is it deployed?** Docker containers orchestrated locally, deployed to AWS
Elastic Beanstalk via GitHub Actions. Push to `main` and the CI/CD pipeline
handles the rest.
