pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub-cred'
        DOCKERHUB_NAMESPACE = 'avishkarlakade'

        BACKEND_IMAGE = "avishkarlakade/auth-backend"
        FRONTEND_IMAGE = "avishkarlakade/auth-frontend"
        ADMIN_IMAGE = "avishkarlakade/auth-admin"

        KUBECONFIG = '/home/jenkins/.kube/config'
        K8S_NAMESPACE = 'auth-system'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Cloning repository...'
                git branch: 'main', url: 'https://github.com/AvishkarLakade3119/Auth-system'
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

                stage('Admin-UI') {
                    steps {
                        echo 'Building admin-ui Docker image...'
                        script {
                            docker.build("${ADMIN_IMAGE}:latest", './admin-ui')
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
                        docker.image("${ADMIN_IMAGE}:latest").push()
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo 'Deploying to Kubernetes cluster...'
                script {
                    sh """
                        kubectl get namespace ${K8S_NAMESPACE} || kubectl create namespace ${K8S_NAMESPACE}
                        kubectl apply -n ${K8S_NAMESPACE} -f ./k8s/

                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/backend-deployment &
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/frontend-deployment &
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/admin-deployment &

                        wait
                    """
                }
            }
        }

        stage('Port Forward Services') {
            steps {
                echo 'Starting port-forwarding...'
                script {
                    sh """
                        pkill -f 'kubectl port-forward' || true

                        nohup kubectl port-forward service/frontend 80:80 -n ${K8S_NAMESPACE} > /tmp/frontend-pf.log 2>&1 &
                        nohup kubectl port-forward service/backend 5001:5001 -n ${K8S_NAMESPACE} > /tmp/backend-pf.log 2>&1 &
                        nohup kubectl port-forward service/admin-ui 3000:80 -n ${K8S_NAMESPACE} > /tmp/admin-pf.log 2>&1 &

                        echo "Port forwarding started."
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
