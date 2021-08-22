terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 3.77.0"
    }
  }
}

provider "google" {
  project = "modified-voyage-320812"
  region  = "europe-west1"
  zone    = "europe-west1-c"
}

resource "google_service_account" "default" {
  account_id   = "service-account-id"
  display_name = "Service Account"
}

resource "google_container_cluster" "primary" {
  name                     = "my-gke-cluster"
  location                 = "europe-west1"
  remove_default_node_pool = true
  initial_node_count       = 1
}

resource "google_container_node_pool" "primary_preemptible_nodes" {
  name       = "my-node-pool"
  location   = "europe-west1"
  cluster    = google_container_cluster.primary.name
  node_count = 1
  node_config {
    preemptible     = true
    machine_type    = "e2-micro"
    service_account = google_service_account.default.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}

resource "google_cloudbuild_trigger" "filename_trigger" {
  name = "tf-build-and-push-image"
  description = "Terraformed trigger for building an image and pushing it to Container Registry"
  github {
    owner = "Sebelino"
    name = "aax-to-mp3"
    push {
      branch = "^master$"
    }
  }

  filename = "cloudbuild.yaml"
}
