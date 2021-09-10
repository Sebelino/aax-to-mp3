terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 3.77.0"
    }
  }
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
    service_account = var.service_account_email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
