// back-end/src/view/salvarCardapioRouters.js
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const salvarCardapioService = require("../Model/salvarCardapioService");
const { banco } = require("../Model/database");
const natural = require("natural");

// =========================================
// FUNÇÃO PARA GERAR HASH
// =========================================
function gerarHashUnico(data) {
    return crypto.createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex");
}

// =========================================
// SIMILARIDADE COM LEVENSHTEIN
// =========================================
function calcularSimilaridade(a, b) {
    // Usa distância de Levenshtein normalizada
    const distance = natural.LevenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    
    // Retorna similaridade entre 0 e 1 (1 = idêntico, 0 = totalmente diferente)
    const similarity = 1 - (distance / maxLength);
    
    return similarity;
}

router.get('/usuario/:usuario_id', async (req, res) => {
    try {
        const [rows] = await banco.query(
            'SELECT * FROM cardapio WHERE usuario_id = ? ORDER BY id DESC',
            [req.params.usuario_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// =========================================
// POST /salvarCardapio
// =========================================
router.post("/", async (req, res) => {
    try {
        let { usuario_id, respostas_id, hash_respostas, cardapio_texto, respostas_formulario } = req.body;

        console.log("📥 Dados recebidos:", {
            usuario_id,
            respostas_id,
            cardapio_texto_type: typeof cardapio_texto,
            cardapio_texto_vazio: !cardapio_texto || cardapio_texto === "{}",
            respostas_formulario_type: typeof respostas_formulario
        });

        // ======================================================
        // 1️⃣ CONVERTER PARA STRING ANTES DA VALIDAÇÃO
        // ======================================================
        if (typeof cardapio_texto === "object") {
            cardapio_texto = JSON.stringify(cardapio_texto);
        }
        if (typeof respostas_formulario === "object") {
            respostas_formulario = JSON.stringify(respostas_formulario);
        }

        // ======================================================
        // 2️⃣ VALIDAÇÃO APÓS CONVERSÃO
        // ======================================================
        if (!usuario_id) {
            return res.status(400).json({
                sucesso: false,
                erro: "usuario_id é obrigatório."
            });
        }

        if (!cardapio_texto || cardapio_texto === "{}" || cardapio_texto.trim() === "") {
            return res.status(400).json({
                sucesso: false,
                erro: "cardapio_texto está vazio ou inválido."
            });
        }

        // ======================================================
        // 3️⃣ GERAR HASH SE NÃO ENVIADO
        // ======================================================
        if (!hash_respostas || hash_respostas.length < 20) {
            if (!respostas_formulario) {
                return res.status(400).json({
                    sucesso: false,
                    erro: "É necessário enviar 'respostas_formulario' para gerar o hash."
                });
            }
            hash_respostas = gerarHashUnico(respostas_formulario);
            console.log("🔑 Hash gerado no backend:", hash_respostas);
        }

        // ======================================================
        // 4️⃣ VERIFICAR CARDÁPIO EXISTENTE POR HASH
        // ======================================================
        console.log("🔍 Verificando hash no banco:", hash_respostas);
        
        const existente = await salvarCardapioService.buscarPorHash(hash_respostas);

        if (existente) {
            console.log("♻️ Cardápio reutilizado via HASH - ID:", existente.id);
            return res.status(200).json({
                sucesso: true,
                reutilizado: true,
                mensagem: "Cardápio já existia. Retornado por hash.",
                cardapio: existente
            });
        }

        console.log("✅ Hash não encontrado, continuando para verificar similaridade...");

        // ======================================================
        // 5️⃣ SIMILARIDADE PROFUNDA ENTRE RESPOSTAS (ATIVADO - 95%)
        // ======================================================
        console.log("🔍 Buscando respostas existentes do usuário:", usuario_id);
        
        const [respostasExistentes] = await banco.query(
            "SELECT id, usuario_id, name, age, imc, height, weight, gender, objective, level, alergia, trabalho, alimentosFavoritos, esporte, dietaAtual, rotina, tempoPreparo FROM respostas_formulario WHERE usuario_id = ?",
            [usuario_id]
        );

        console.log(`📊 Encontradas ${respostasExistentes.length} respostas anteriores deste usuário`);

        let dadosUsuario = {};
        try {
            dadosUsuario = typeof respostas_formulario === 'string' 
                ? JSON.parse(respostas_formulario) 
                : respostas_formulario;
        } catch (e) {
            console.error("Erro ao parsear respostas_formulario:", e);
        }

        const respostasTextoUsuario = JSON.stringify(dadosUsuario).toLowerCase();
        let melhorSimilaridade = 0;

        for (const item of respostasExistentes) {
            const respostasExistentesObj = {
                name: item.name,
                age: item.age,
                imc: item.imc,
                height: item.height,
                weight: item.weight,
                gender: item.gender,
                objective: item.objective,
                level: item.level,
                alergia: item.alergia,
                trabalho: item.trabalho,
                alimentosFavoritos: item.alimentosFavoritos,
                esporte: item.esporte,
                dietaAtual: item.dietaAtual,
                rotina: item.rotina,
                tempoPreparo: item.tempoPreparo
            };

            const respostasTextoBanco = JSON.stringify(respostasExistentesObj).toLowerCase();

            const similaridade = calcularSimilaridade(
                respostasTextoUsuario,
                respostasTextoBanco
            );

            console.log(`🔍 Similaridade com registro ${item.id}: ${(similaridade * 100).toFixed(2)}%`);

            if (similaridade > melhorSimilaridade) {
                melhorSimilaridade = similaridade;
            }

            // ✅ LIMITE DE 95% (0.95) - RECOMENDADO
            if (similaridade > 0.95) {
                const [cardapioSalvo] = await banco.query(
                    "SELECT * FROM cardapio WHERE usuario_id = ? ORDER BY id DESC LIMIT 1",
                    [item.usuario_id]
                );

                if (cardapioSalvo.length > 0) {
                    console.log(`♻️ Cardápio reutilizado por alta similaridade ${(similaridade * 100).toFixed(2)}% - ID: ${cardapioSalvo[0].id}`);
                    return res.status(200).json({
                        sucesso: true,
                        reutilizado: true,
                        mensagem: "Cardápio reaproveitado por similaridade profunda.",
                        cardapio: cardapioSalvo[0]
                    });
                }
            }
        }

        console.log(`📈 Melhor similaridade encontrada: ${(melhorSimilaridade * 100).toFixed(2)}% (limite: 95%)`);
        console.log("✅ Nenhuma similaridade alta encontrada, criando novo cardápio...");

        // ======================================================
        // 6️⃣ SALVAR NOVO CARDÁPIO
        // ======================================================
        const novoCardapio = await salvarCardapioService.salvarCardapio(
            usuario_id,
            respostas_id || null,
            hash_respostas,
            cardapio_texto
        );

        console.log("✅ Novo cardápio salvo com ID:", novoCardapio.id);

        return res.status(201).json({
            sucesso: true,
            reutilizado: false,
            mensagem: "Novo cardápio criado!",
            cardapio: novoCardapio
        });

    } catch (error) {
        console.error("❌ Erro ao salvar cardápio:", error);
        console.error("Stack trace:", error.stack);
        
        return res.status(500).json({
            sucesso: false,
            erro: "Erro interno ao salvar cardápio.",
            detalhes: error.message
        });
    }
});

module.exports = router;