<?php  
session_start();
?>
<fieldset class="form-fieldset">
    <legend class="form-section-header">Crear Nuevas Tarjetas en Lote</legend>
    <form id="create-cards-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
        <div class="form-group">
            <label for="quantity">Cantidad a crear</label>
            <input type="number" id="quantity" name="quantity" min="1" max="500" required placeholder="Ej: 50">
            <button type="submit" class="action-btn">Crear Tarjetas</button>
        </div>
        <div id="create-cards-feedback" class="form-message"></div>
    </form>
</fieldset>

<fieldset class="form-fieldset" style="margin-top: 2rem;">
    <legend class="form-section-header">Tarjetas Disponibles para Asignar</legend>
    <div class="product-list-container" style="max-height: 30vh;">
        <table class="product-table">
            <thead>
                <tr>
                    <th>Número de Tarjeta</th>
                    <th>Fecha de Creación</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody id="unassigned-cards-tbody">
                </tbody>
        </table>
    </div>
</fieldset>

<fieldset class="form-fieldset" style="margin-top: 2rem;">
    <legend class="form-section-header">Tarjetas Asignadas a Clientes</legend>
    <div class="product-list-container" style="max-height: 40vh;">
        <table class="product-table">
            <thead>
                <tr>
                    <th>Número de Tarjeta</th>
                    <th>Cliente</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="assigned-cards-tbody">
                </tbody>
        </table>
    </div>
</fieldset>

<div id="assign-card-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="assign-modal-title">Asignar Tarjeta</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <p>Buscando clientes que <strong>no</strong> tienen una tarjeta asignada.</p>
            <div class="search-container" style="margin-bottom: 1rem;">
                <input type="text" id="customer-assign-search" placeholder="Buscar por nombre, apellido o usuario...">
            </div>
            <div id="customer-search-results" class="product-list-container" style="max-height: 25vh;">
                </div>
            <div id="assign-modal-feedback" class="form-message"></div>
        </div>
        <div class="modal-footer" style="justify-content: flex-end;">
            <button id="modal-cancel-btn-card" class="modal-btn modal-btn-secondary">Cancelar</button>
        </div>
    </div>
</div>