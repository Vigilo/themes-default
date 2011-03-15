var SearchResultsModel = new Class({
    Extends: Jx.Grid.Model,

    getColumnCount: function () {
        return (this.data && this.data.labels && this.data.labels[0]) ?
            this.data.labels[0].length : 0;
    },

    getRowCount: function () {
        return (this.data && this.data.labels) ? this.data.labels.length : 0;
    },

    getRawValueAt: function (row, col) {
        return (this.data && this.data.labels && $chk(this.data.labels[row])) ?
            this.data.labels[row][col] : '';
    },

    getValueAt: function (row, col) {
        var content = (this.data && this.data.labels && $chk(this.data.labels[row])) ?
            this.data.labels[row][col] : '';
        var value = Element('div', {'text': content, 'title': content});
        var container = Element('div');
        value.inject(container);
        return container.get('html');
    },

    getIDAt: function (row, col) {
        return (this.data && this.data.ids && $chk(this.data.ids[row])) ?
            this.data.ids[row][col] : null;
    }
});

var VigiloGrid = new Class({
    Extends: Jx.Grid,

    getRowColumnFromEvent: function (e) {
        var target;
        for (target = $(e.target);
            target.tagName != 'TD' &&
            target.tagName != 'TH' &&
            target.get('class') != 'jxGridContainer';
            target = target.getParent())
            continue; // On remonte dans la hiérarchie.
        return this.parent({'target': target});
    }
});

var Search = new Class({
    initialize: function () {
        this.search_results = new VigiloGrid({
            parent: 'search_results',
            alternateRowColors: true,
            columnHeaders: true,
            rowPrelight: true,
            cellSelection: true
        });

        this.search_dialog = new Jx.Dialog({
            label: l_('Search for an host/graph'),
            modal: false,
            width: 605,
            height: 405,
            content: 'search_container'
        });

        this.search_request = new Request.JSON({
            url: app_path + 'rpc/searchHostAndGraph',
            onSuccess: this.updateResults.bind(this)
        });

        $('search').addEvent('click', function (e) {
            e.stop();
            this.search_dialog.open();
        }.bind(this));

        this.search_dialog.addEvent('open', function () {
            $('search_form_host').focus();
            // On doit afficher une grille vide la première fois,
            // afin de donner les bonnes dimensions à la grille.
            if (this.search_results.model)
                return;
            this.search_results.setModel(new Jx.Grid.Model([], {
                colWidth: 255,
                columnHeaders: [l_('Host'), l_('Graph')]
            }));
        }.bind(this));

        $('search_form_search').addEvent('click', function (e) {
            e.stop();
            if ($('search_form_host').get('value') == '' &&
                $('search_form_graph').get('value') == '')
                $('search_form_graph').set('value', '*');
            this.search_request.post($('search_form'));
        }.bind(this));
    },

    updateResults: function (data) {
        // On met à jour le contenu de la grille
        // avec les résultats de la recherche.
        var model = new SearchResultsModel(data, {
            colWidth: 255,
            columnHeaders: [l_('Host'), l_('Graph')]
        });

        function selectCell(row, col) {
            var host = this.getRawValueAt(row, 0);
            var graph = this.getRawValueAt(row, 1);
            var idhost = this.getIDAt(row, 0);
            var idgraph = this.getIDAt(row, 1);

            // Sélection d'un graphe.
            if (col == 1) {
                // La recherche ne concernait que l'hôte.
                if (graph == '')
                    return;
                window.toolbar.host_picker.setItem(idhost, host);
                window.toolbar.graph_picker.setItem(idgraph, graph);
                window.toolbar.show_graph.clicked(null);
            }
            // Sélection d'un hôte.
            else {
                window.toolbar.host_picker.setItem(idhost, host);
                // On restaure le sélecteur de graphe dans son état initial,
                // où il affiche un message "Sélectionnez un graphe".
                window.toolbar.graph_picker.setItem(null,
                window.toolbar.graph_picker.options.label);
                window.toolbar.show_graph.setEnabled(0);
                /// @TODO: à décommenter si on veut ouvrir automatiquement
                /// la page Nagios de l'hôte.
//                window.toolbar.show_nagios.clicked(null);
            }
        }

        model.addEvent('select-cell', selectCell.bind(model));
        this.search_results.setModel(model);
    }
});

window.addEvent('load', function () {
    new Search();
});
