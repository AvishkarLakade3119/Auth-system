pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub-cred'
        DOCKERHUB_NAMESPACE   = 'avishkarlakade'

        BACKEND_IMAGE   = "${DOCKERHUB_NAMESPACE}/auth-backend"
        FRONTEND_IMAGE  = "${DOCKERHUB_NAMESPACE}/auth-frontend"
        ADMIN_IMAGE     = "${DOCKERHUB_NAMESPACE}/auth-admin"

        K8S_NAMESPACE   = 'auth-system'
        KUBECONFIG_FILE = '/var/lib/jenkins/.kube/config'
    }

    stages {

        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    credentialsId: 'GitHub-cred',
                    url: 'https://github.com/AvishkarLakade3119/Auth-system.git'
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Backend') {
                    steps {
                        script {
                            docker.build("${BACKEND_IMAGE}:latest", './backend')
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        script {
                            docker.build("${FRONTEND_IMAGE}:latest", './frontend')
                        }
                    }
                }
                stage('Admin-UI') {
                    steps {
                        script {
                            docker.build("${ADMIN_IMAGE}:latest", './admin-ui')
                        }
                    }
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                script {
                    docker.withRegistry('', DOCKERHUB_CREDENTIALS) {
                        docker.image("${BACKEND_IMAGE}:latest").push()
                        docker.image("${FRONTEND_IMAGE}:latest").push()
                        docker.image("${ADMIN_IMAGE}:latest").push()
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    sh """
                        export KUBECONFIG=${KUBECONFIG_FILE}

                        # Create namespace if not exists
                        kubectl get namespace ${K8S_NAMESPACE} || kubectl create namespace ${K8S_NAMESPACE}

                        echo "Applying Kubernetes Manifests..."
                        kubectl apply -n ${K8S_NAMESPACE} -f ./k8s/

                        echo "Restarting deployments so they pull latest image..."
                        kubectl -n ${K8S_NAMESPACE} rollout restart deployment/backend-deployment
                        kubectl -n ${K8S_NAMESPACE} rollout restart deployment/frontend
                        kubectl -n ${K8S_NAMESPACE} rollout restart deployment/admin-ui-deployment

                        echo "Waiting for Rollouts..."
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/backend-deployment --timeout=180s
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/frontend --timeout=180s
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/admin-ui-deployment --timeout=180s
                    """
                }
            }
        }

    }

    post {
        always {
            cleanWs()
        }
    }
}
