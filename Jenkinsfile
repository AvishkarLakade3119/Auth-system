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
                    url: 'https://github.com/AvishkarLakade3119/Auth-system'
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
                script {
                    sh """
                        export KUBECONFIG=${KUBECONFIG_FILE}

                        # Create namespace if not exists
                        kubectl get namespace ${K8S_NAMESPACE} || kubectl create namespace ${K8S_NAMESPACE}

                        # Apply manifests
                        kubectl apply -n ${K8S_NAMESPACE} -f ./k8s/

                        echo "Waiting for deployments to complete..."
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/backend-deployment --timeout=120s
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/frontend-deployment --timeout=120s
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/admin-ui-deployment --timeout=120s
                    """
                }
            }
        }

        stage('Port Forward Services') {
            steps {
                script {
                    sh """
                        # Kill any existing port-forward processes
                        pkill -f 'kubectl port-forward' || true

                        # Start port-forward in background
                        nohup kubectl port-forward service/frontend 8080:80 -n ${K8S_NAMESPACE} > /tmp/frontend-pf.log 2>&1 &
                        nohup kubectl port-forward service/backend 5001:5001 -n ${K8S_NAMESPACE} > /tmp/backend-pf.log 2>&1 &
                        nohup kubectl port-forward service/admin-ui 3001:80 -n ${K8S_NAMESPACE} > /tmp/adminui-pf.log 2>&1 &
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
