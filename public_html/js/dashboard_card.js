// public_html/js/dashboard_card.js

document.addEventListener('DOMContentLoaded', () => {
    // Asegurarnos de que estamos en la vista correcta antes de ejecutar
    if (!document.getElementById('transaction-history-body')) return;

    const loadCardData = async () => {
        const cardNumberEl = document.getElementById('card-number');
        const cardBalanceEl = document.getElementById('card-balance');
        const historyBodyEl = document.getElementById('transaction-history-body');

        try {
            const response = await fetch('api/index.php?resource=get-card-details');
            const result = await response.json();

            if (result.success && result.card) {
                const { card, transactions } = result;
                
                cardNumberEl.textContent = card.numero_tarjeta;
                cardBalanceEl.textContent = `$${parseFloat(card.saldo).toFixed(2)}`;
                
                historyBodyEl.innerHTML = '';
                if (transactions.length > 0) {
                    transactions.forEach(tx => {
                        const row = document.createElement('tr');
                        const isCredit = tx.monto > 0;
                        
                        row.innerHTML = `
                            <td>${new Date(tx.fecha).toLocaleDateString('es-SV')}</td>
                            <td>${tx.descripcion}</td>
                            <td class="transaction-amount ${isCredit ? 'credit' : 'debit'}">
                                ${isCredit ? '+' : '-'} $${Math.abs(tx.monto).toFixed(2)}
                            </td>
                        `;
                        historyBodyEl.appendChild(row);
                    });
                } else {
                    historyBodyEl.innerHTML = '<tr><td colspan="3">No se han realizado movimientos.</td></tr>';
                }
            } else {
                // Manejar el caso donde el usuario no tiene tarjeta (aunque el menú no debería aparecer)
                document.querySelector('.card-summary-container').style.display = 'none';
                document.querySelector('.transaction-history-container').innerHTML = '<p>No tienes una tarjeta asignada.</p>';
            }
        } catch (error) {
            console.error('Error al cargar datos de la tarjeta:', error);
            cardBalanceEl.textContent = 'Error';
            cardNumberEl.textContent = 'Error';
        }
    };

    loadCardData();
});