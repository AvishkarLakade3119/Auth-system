pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub-cred'
        DOCKERHUB_NAMESPACE = 'avishkarlakade'
        BACKEND_IMAGE = "avishkarlakade/chatapp-backend"
        FRONTEND_IMAGE = "avishkarlakade/chatapp-frontend"
        KUBECONFIG = '/home/jenkins/.kube/config'
        K8S_NAMESPACE = 'chat-app'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Cloning repository...'
                git branch: 'main', url: 'https://github.com/AvishkarLakade3119/K8s-chat-app'
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Backend') {
                    steps {
                        echo 'Building backend Docker image...'
                        script {
                            docker.build("${BACKEND_IMAGE}:latest", './backend')
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        echo 'Building frontend Docker image...'
                        script {
                            docker.build("${FRONTEND_IMAGE}:latest", './frontend')
                        }
                    }
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                echo 'Pushing images to DockerHub...'
                script {
                    docker.withRegistry('', "${DOCKERHUB_CREDENTIALS}") {
                        docker.image("${BACKEND_IMAGE}:latest").push()
                        docker.image("${FRONTEND_IMAGE}:latest").push()
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo 'Deploying to Kubernetes cluster...'
                script {
                    sh """
                        # Create namespace if it does not exist
                        kubectl get namespace ${K8S_NAMESPACE} || kubectl create namespace ${K8S_NAMESPACE}

                        # Apply Kubernetes manifests
                        kubectl apply -n ${K8S_NAMESPACE} -f ./k8s/

                        # Rollout status checks (run in background)
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/backend-deployment &
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/frontend-deployment &

                        wait
                    """
                }
            }
        }

        stage('Port Forward Services') {
            steps {
                echo 'Starting background port-forwarding for frontend (80), backend (5001), and MongoDB (27017)...'
                script {
                    sh """
                        # Kill any old port-forwarding processes to avoid conflicts
                        pkill -f 'kubectl port-forward' || true

                        # Start port-forwarding each service in background with nohup
                        nohup kubectl port-forward service/frontend 80:80 -n ${K8S_NAMESPACE} > /tmp/frontend-pf.log 2>&1 &
                        nohup kubectl port-forward service/backend 5001:5001 -n ${K8S_NAMESPACE} > /tmp/backend-pf.log 2>&1 &
                        nohup kubectl port-forward service/mongodb 27017:27017 -n ${K8S_NAMESPACE} > /tmp/mongodb-pf.log 2>&1 &

                        echo "Port forwarding started successfully."
                    """
                }
            }
        }
    }

    post {
        always {
            echo 'Cleaning workspace...'
            cleanWs()
        }
    }
}
