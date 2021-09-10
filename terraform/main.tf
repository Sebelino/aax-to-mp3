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

module "gke_cluster" {
  source                = "./gke_cluster"
  service_account_email = google_service_account.default.email
  count                 = var.create_gke_cluster ? 1 : 0
}

resource "google_cloudbuild_trigger" "filename_trigger" {
  name        = "tf-build-and-push-image"
  description = "Terraformed trigger for building an image and pushing it to Container Registry"
  github {
    owner = "Sebelino"
    name  = "aax-to-mp3"
    push {
      branch = "^master$"
    }
  }

  filename = "cloudbuild.yaml"
}
