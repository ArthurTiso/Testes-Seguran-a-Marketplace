'use strict';

/**
 * Validações de entrada (defesa contra dados inválidos / injeção).
 * Política de senha segue o modelo da planilha RECURSOS DE SEGURANÇA:
 *  - mínimo de 8 caracteres
 *  - exige número, letra maiúscula e símbolo
 */

const POLITICA_SENHA = {
  minLen: 8,
  regexMaiuscula: /[A-Z]/,
  regexNumero: /[0-9]/,
  regexSimbolo: /[^A-Za-z0-9]/,
};

function validarForcaSenha(senha) {
  const erros = [];
  if (!senha || senha.length < POLITICA_SENHA.minLen) {
    erros.push('A senha deve ter no mínimo 8 caracteres.');
  }
  if (!POLITICA_SENHA.regexMaiuscula.test(senha || '')) {
    erros.push('A senha deve conter ao menos uma letra maiúscula.');
  }
  if (!POLITICA_SENHA.regexNumero.test(senha || '')) {
    erros.push('A senha deve conter ao menos um número.');
  }
  if (!POLITICA_SENHA.regexSimbolo.test(senha || '')) {
    erros.push('A senha deve conter ao menos um símbolo (ex.: ! @ # $ %).');
  }
  return { ok: erros.length === 0, erros };
}

// Validação de CPF (dígitos verificadores). Impede CPFs inválidos/forjados.
function validarCpf(cpf) {
  if (!cpf) return false;
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(d[i], 10) * (10 - i);
  let r = (soma * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9], 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(d[i], 10) * (11 - i);
  r = (soma * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10], 10);
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

// Normaliza (remove não-dígitos) campos numéricos.
const soDigitos = (s) => (s || '').replace(/\D/g, '');

module.exports = {
  POLITICA_SENHA,
  validarForcaSenha,
  validarCpf,
  validarEmail,
  soDigitos,
};
