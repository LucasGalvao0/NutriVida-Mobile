//configrações iniciais
const express = require('express'); // estou criando o servidor web
const cors = require('cors');// cors evita bloqueios nas requisições
const app = express();
const { checkConnection, banco } = require('./Model/database');
const dotenv = require('dotenv');
const passport = require('passport');
const session = require('express-session');
const path = require('path');

const criarCardapioRotas = require('./View/criarCardapioRouters');
const salvarCardapioRouters = require('./View/salvarCardapioRouters');
const salvarRespostasRouters = require('./View/salvarRespostaRouters');
const rotasUsuarios = require('./View/usuariosRouters');
const rotasAuth = require('./View/authRouters');
const rotasConsultorios = require('./View/consultoriosRouters');
const rotasAgendamentos = require('./View/agendamentoRouters');

// 1. IMPORTAR OS ARQUIVOS DE ROTAS FALTANTES // 👈 ADICIONADO AQUI
// ATENÇÃO: Verifique se os nomes dos arquivos abaixo estão corretos na sua pasta 'View'
const rotasNutricionistas = require('./View/nutricionistaRouters'); // ou o nome exato do seu arquivo
const rotasContatos = require('./View/contatosRouters'); // ou o nome exato do seu arquivo de contatos



// Middleware
app.use(express.json());

app.use(cors());
app.use(express.json());// fala para o express entender quando enviamos dados Json

(async () => {
  const isDbConnected = await checkConnection();
  if (isDbConnected) {
    console.log("Servidor Banco de Dados - OK ...");
  } else {
    console.error("Falha na conexão com o banco de dados!");
  }
})();

// Rota para buscar dados
app.get('/dados', async (req, res) => {
    try {
        const [result] = await banco.query('SELECT * FROM cardapio');
        res.json(result);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo_fallback',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Ajuste se usar HTTPS
}));

// Inicialização do Passport
app.use(passport.initialize());
app.use(passport.session());

// Configuração do Passport com Google
require('./View/googleAuth');

// Rota para o login com o Google
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"], // Escopos necessários para pegar as informações do Google
    prompt: 'select_account' // Força a escolha da conta do Google toda vez
  })
);

// Callback do Google após login
app.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const { id, nome_usuario, email } = req.user;

    // Redireciona para a página de sucesso com os dados via query
    res.redirect(`http://localhost:3000/googleSuccess.html?id=${id}&nome_usuario=${encodeURIComponent(nome_usuario)}&email=${encodeURIComponent(email)}`);
  }
);


// Página de falha
app.get("/auth/google/failure", (req, res) => {
  res.send("Falha no login com o Google.");
});

// REGISTRO DE ROTAS
app.use("/usuarios", rotasUsuarios);
app.use("/auth", rotasAuth);

app.use('/cardapio', criarCardapioRotas);
app.use('/salvarCardapio', salvarCardapioRouters);
app.use('/respostas', salvarRespostasRouters);

app.use('/agendamentos', rotasAgendamentos);
app.use('/consultorios', rotasConsultorios);

// 2. DIZER AO EXPRESS PARA USAR AS ROTAS FALTANTES // 👈 ADICIONADO AQUI
app.use('/nutricionistas', rotasNutricionistas);
app.use('/contatos', rotasContatos);


app.listen(3000, () => console.log("API rodando na porta 3000"));