import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDesely8LrF-5KNZEZk3p5vNB7rxJppdJw",
  authDomain: "estudo-7e80f.firebaseapp.com",
  projectId: "estudo-7e80f",
  storageBucket: "estudo-7e80f.firebasestorage.app",
  messagingSenderId: "143543444492",
  appId: "1:143543444492:web:eebf60910fbcce2513fa29",
  measurementId: "G-558MNQ3R0Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let todosRecibos = [];

const listaRecibosDiv = document.getElementById('listaRecibos');
const totalRegistrosSpan = document.getElementById('totalRegistros');
const filtroBusca = document.getElementById('filtroBusca');
const btnAtualizar = document.getElementById('btnAtualizar');

// Elementos do PWA
let deferredPrompt;
const btnInstalar = document.getElementById('btnInstalar');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstalar.style.display = 'flex'; // Exibe o botão de instalação
});

btnInstalar.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        console.log('Usuário aceitou a instalação do PWA');
    }
    deferredPrompt = null;
    btnInstalar.style.display = 'none';
});

// Registro do Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('Service Worker registrado:', reg.scope))
            .catch((err) => console.log('Erro no Service Worker:', err));
    });
}

// Modal de visualização
const modalVisualizacao = document.getElementById('modalVisualizacao');
const modalImagemAmpliada = document.getElementById('modalImagemAmpliada');
const modalTitulo = document.getElementById('modalTitulo');
const btnFecharModal = document.getElementById('btnFecharModal');

async function carregarRecibos() {
    listaRecibosDiv.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Buscando recibos e registros de auditoria...</p>
        </div>
    `;

    try {
        const q = query(collection(db, "recibos"), orderBy("dataHora", "desc"));
        const querySnapshot = await getDocs(q);

        todosRecibos = [];
        querySnapshot.forEach((doc) => {
            todosRecibos.push({ id: doc.id, ...doc.data() });
        });

        totalRegistrosSpan.innerText = todosRecibos.length;
        renderizarCards(todosRecibos);

    } catch (error) {
        console.error("Erro ao carregar recibos:", error);
        listaRecibosDiv.innerHTML = `
            <div class="empty-state" style="color: var(--danger);">
                <p>❌ Erro ao conectar ao Firebase. Verifique sua conexão ou permissões.</p>
            </div>
        `;
    }
}

function renderizarCards(dadosArray) {
    if (dadosArray.length === 0) {
        listaRecibosDiv.innerHTML = `
            <div class="empty-state">
                <p>📭 Nenhum recibo ou registro de auditoria encontrado.</p>
            </div>
        `;
        return;
    }

    listaRecibosDiv.innerHTML = "";

    dadosArray.forEach((dados) => {
        let dataFormatada = "Data indisponível";
        if (dados.dataHora && dados.dataHora.toDate) {
            dataFormatada = dados.dataHora.toDate().toLocaleString('pt-BR');
        }

        const card = document.createElement('div');
        card.className = "recibo-card animate-scale-up";

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <h3 class="cliente-nome">👤 ${dados.nomeCliente || "Sem Nome"}</h3>
                    <span class="recibo-valor">R$ ${dados.valorRecibo || "0,00"}</span>
                </div>
                <div class="card-body">
                    <p><strong>CPF:</strong> ${dados.cpfCliente || "-"}</p>
                    <p><strong>Data/Hora:</strong> ${dataFormatada}</p>
                    <div class="historico-box">
                        ⚠️ <strong>Histórico de Comportamento / Acessos:</strong><br>
                        ${dados.historicoComportamento || "Nenhum histórico registrado"}
                    </div>
                </div>
            </div>
            <div class="card-imagens">
                <div class="img-preview-wrapper">
                    <span>Fachada</span>
                    <img src="${dados.fotoFachada || ''}" class="thumbnail" alt="Fachada" data-url="${dados.fotoFachada || ''}" data-titulo="Foto da Fachada - ${dados.nomeCliente || ''}">
                </div>
                <div class="img-preview-wrapper">
                    <span>Assinatura</span>
                    <img src="${dados.fotoAssinatura || ''}" class="thumbnail" alt="Assinatura" data-url="${dados.fotoAssinatura || ''}" data-titulo="Assinatura Digital - ${dados.nomeCliente || ''}">
                </div>
            </div>
        `;

        listaRecibosDiv.appendChild(card);
    });

    // Adiciona evento de clique nas miniaturas para abrir o modal de zoom
    document.querySelectorAll('.thumbnail').forEach(img => {
        img.addEventListener('click', (e) => {
            const url = e.target.getAttribute('data-url');
            const titulo = e.target.getAttribute('data-titulo');
            if (url) {
                modalImagemAmpliada.src = url;
                modalTitulo.innerText = titulo;
                modalVisualizacao.style.display = 'flex';
            }
        });
    });
}

// Filtro de busca por nome ou CPF
filtroBusca.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtrados = todosRecibos.filter(item => {
        const nome = (item.nomeCliente || "").toLowerCase();
        const cpf = (item.cpfCliente || "").toLowerCase();
        return nome.includes(termo) || cpf.includes(termo);
    });
    renderizarCards(filtrados);
});

btnAtualizar.addEventListener('click', carregarRecibos);

// Fechar modal
btnFecharModal.addEventListener('click', () => {
    modalVisualizacao.style.display = 'none';
    modalImagemAmpliada.src = "";
});

window.addEventListener('click', (e) => {
    if (e.target === modalVisualizacao) {
        modalVisualizacao.style.display = 'none';
        modalImagemAmpliada.src = "";
    }
});

// Inicialização
carregarRecibos();
