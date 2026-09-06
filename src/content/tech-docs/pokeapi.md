---
title: 📝 Template
tagline: "Full-stack app with React, FastAPI, Docker & AWS"
subtitle: "A reusable landing page template showcasing modern full-stack architecture. Built with a Python async backend, React frontend, containerized deployment, and cloud infrastructure."
heroCta:
  primary:
    label: Watch Demo
    href: "#demo"
  secondary:
    label: Explore Features
    href: "#features"
# demo:
#   youtubeId: NaE7lj-nMyk
#   title: Demo video
code:
  filename: main.py
  lang: python
  source: |-
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
features:
  - icon: "⚡"
    title: FastAPI Backend
    description: "Async Python API with automatic docs, type validation, and high performance."
  - icon: "⚛️"
    title: React Frontend
    description: "Interactive UI with charts for stats visualization and paginated data tables."
  - icon: "🐳"
    title: Docker Containers
    description: "Fully containerized: database, backend, frontend, and Nginx reverse proxy."
  - icon: "☁️"
    title: AWS Deployment
    description: "Deployed on Elastic Beanstalk with automated CI/CD via GitHub Actions."
  - icon: "🔐"
    title: Authentication
    description: "Secure endpoints with user authentication and protected routes."
  - icon: "📊"
    title: Data Visualization
    description: "Interactive graphs and tables with real-time filtering and pagination."
technologies:
  - heading: React frontend
    items:
      - "Graphs for displaying stats"
      - "Tables with pagination (connected to the database)"
  - heading: Python backend
    items:
      - "Framework FastAPI"
      - Authentication
      - "Unit of Work (UoW) pattern for database operations"
      - "DTOs & database models"
  - heading: Docker
    items:
      - Database container
      - Nginx container
      - Frontend container
      - Backend container
  - heading: AWS
    items:
      - "Elastic Beanstalk for deployment"
  - heading: GitHub
    items:
      - GitHub Secrets
      - "GitHub Workflows for automated AWS deployment"
      - Version control
faqs:
  - question: What is this project about?
    answer: "An interactive Pokedex that pulls data from the public PokeAPI REST service. It showcases how different technologies (React, FastAPI, Docker, AWS) can come together to build a fun and functional application."
  - question: Can I use this as a template?
    answer: "Absolutely. The architecture is designed to be reusable: swap the API source, change the data models, and you have a solid full-stack foundation for any data-driven application."
  - question: How is it deployed?
    answer: "The project uses Docker containers orchestrated locally, and is deployed to AWS Elastic Beanstalk via GitHub Actions workflows. Push to main and the CI/CD pipeline handles the rest."
  - question: What databases does it support?
    answer: "The backend uses a database container (configurable). The Unit of Work pattern makes it easy to swap database implementations without changing business logic."
cta:
  heading: Ready to build?
  description: "Fork this template and start building your own full-stack application."
  url: https://github.com
  label: View on GitHub
---

This project is an API that pulls data from the public Pokémon REST API ([https://pokeapi.co](https://pokeapi.co)) to show different stats for your favorite Pokémon.

With this custom Pokédex, you can filter Pokémon by name and check their stats with just one click on the chosen Pokémon.

It's a simple but stylish way to see how different technologies can come together to build a fun Pokédex. The same approach can also be applied to real-world cases: building companion apps, creating interactive dashboards, or teaching beginners how to work with APIs in an engaging way.

For now, we've kept it simple by using only the PokeAPI REST API, but the system can easily grow by adding more data and features in the future!
