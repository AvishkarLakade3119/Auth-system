pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub-cred'
        DOCKERHUB_NAMESPACE = 'avishkarlakade'

        BACKEND_IMAGE = "${DOCKERHUB_NAMESPACE}/auth-backend"
        FRONTEND_IMAGE = "${DOCKERHUB_NAMESPACE}/auth-frontend"
        ADMIN_IMAGE = "${DOCKERHUB_NAMESPACE}/auth-admin"

        K8S_NAMESPACE = 'auth-system'
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
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    script {
                        sh """
                            export KUBECONFIG=${KUBECONFIG_FILE}
                            set -e
                            kubectl apply -f ./k8s/namespace.yml
                            kubectl apply -n ${K8S_NAMESPACE} -f ./k8s/

                            echo "Waiting for deployments to complete..."
                            kubectl -n ${K8S_NAMESPACE} rollout status deployment/backend-deployment
                            kubectl -n ${K8S_NAMESPACE} rollout status deployment/frontend-deployment
                            kubectl -n ${K8S_NAMESPACE} rollout status deployment/admin-ui-deployment
                        """
                    }
                }
            }
        }

        stage('Port Forward Services') {
            steps {
                script {
                    sh """
                        pkill -f 'kubectl port-forward' || true

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
