﻿(function ($, document, window) {

    var currentType;

    function loadTabs(page, tabs) {

        var html = '';

        html += '<div data-role="controlgroup" data-type="horizontal" data-mini="true">';

        for (var i = 0, length = tabs.length; i < length; i++) {

            var tab = tabs[i];

            var isChecked = i == 0 ? ' checked="checked"' : '';

            html += '<input type="radio" name="radioTypeTab" class="radioTypeTab" id="' + tab.type + '" value="' + tab.type + '"' + isChecked + '>';
            html += '<label for="' + tab.type + '">' + tab.name + '</label>';
        }

        html += '</div>';

        var elem = $('.tabs', page).html(html).trigger('create');

        Dashboard.hideLoadingMsg();

        $('.radioTypeTab', elem).on('change', function () {

            if (this.checked) {

                loadType(page, this.id);
            }

        }).trigger('change');
    }

    function loadType(page, type) {

        Dashboard.showLoadingMsg();

        currentType = type;

        var promise1 = ApiClient.getServerConfiguration();
        var promise2 = $.getJSON(ApiClient.getUrl("System/Configuration/MetadataPlugins"));

        $.when(promise1, promise2).done(function (response1, response2) {

            var config = response1[0];
            var metadataPlugins = response2[0];

            config = config.MetadataOptions.filter(function (c) {
                return c.ItemType == type;
            })[0];

            if (config) {

                renderType(page, type, config, metadataPlugins);

                Dashboard.hideLoadingMsg();

            } else {

                $.getJSON(ApiClient.getUrl("System/Configuration/MetadataOptions/Default")).done(function (defaultConfig) {


                    config = defaultConfig;

                    renderType(page, type, config, metadataPlugins);

                    Dashboard.hideLoadingMsg();
                });

            }

        });

    }

    function setVisibilityOfBackdrops(elem, visible) {

        if (visible) {
            elem.show();

            $('input', elem).attr('required', 'required');

        } else {
            elem.hide();

            $('input', elem).attr('required', '').removeAttr('required');
        }
    }

    function renderType(page, type, config, metadataPlugins) {

        var metadataInfo = metadataPlugins.filter(function (f) {

            return type == f.ItemType;
        })[0];

        setVisibilityOfBackdrops($('.backdropFields', page), metadataInfo.SupportedImageTypes.indexOf('Backdrop') != -1);
        setVisibilityOfBackdrops($('.screenshotFields', page), metadataInfo.SupportedImageTypes.indexOf('Screenshot') != -1);

        $('.imageType', page).each(function () {

            var imageType = this.getAttribute('data-imagetype');

            if (metadataInfo.SupportedImageTypes.indexOf(imageType) == -1) {
                $(this).hide();
            } else {
                $(this).show();
            }

            if (getImageConfig(config, imageType).Limit) {

                $('input', this).checked(true).checkboxradio('refresh');

            } else {
                $('input', this).checked(false).checkboxradio('refresh');
            }
        });

        var backdropConfig = getImageConfig(config, 'Backdrop');

        $('#txtMaxBackdrops', page).val(backdropConfig.Limit);
        $('#txtMinBackdropDownloadWidth', page).val(backdropConfig.MinWidth);

        var screenshotConfig = getImageConfig(config, 'Screenshot');

        $('#txtMaxScreenshots', page).val(screenshotConfig.Limit);
        $('#txtMinScreenshotDownloadWidth', page).val(screenshotConfig.MinWidth);

        renderMetadataLocals(page, type, config, metadataInfo);
        renderMetadataFetchers(page, type, config, metadataInfo);
        renderMetadataSavers(page, type, config, metadataInfo);
        renderImageFetchers(page, type, config, metadataInfo);
    }

    function getImageConfig(config, type) {

        return config.ImageOptions.filter(function (i) {

            return i.Type == type;

        })[0] || {

            Type: type,
            MinWidth: type == 'Backdrop' ? 1280 : 0,
            Limit: type == 'Backdrop' ? 3 : 1
        };
    }

    function renderImageFetchers(page, type, config, metadataInfo) {

        var plugins = metadataInfo.Plugins.filter(function (p) {
            return p.Type == 'ImageFetcher';
        });

        var html = '';

        if (!plugins.length) {
            $('.imageFetchers', page).html(html).hide().trigger('create');
            return;
        }

        html += '<fieldset data-role="controlgroup">';
        html += '<legend>Image Fetchers:</legend>';

        for (var i = 0, length = plugins.length; i < length; i++) {

            var plugin = plugins[i];

            var id = 'chkImageFetcher' + i;

            html += '<input class="chkImageFetcher" type="checkbox" name="' + id + '" id="' + id + '" data-mini="true" data-pluginname="' + plugin.Name + '">';
            html += '<label for="' + id + '">' + plugin.Name + '</label>';
        }

        html += '</fieldset>';

        $('.imageFetchers', page).html(html).show().trigger('create');
    }

    function renderMetadataSavers(page, type, config, metadataInfo) {

        var plugins = metadataInfo.Plugins.filter(function (p) {
            return p.Type == 'MetadataSaver';
        });

        var html = '';

        if (!plugins.length) {
            $('.metadataSavers', page).html(html).hide().trigger('create');
            return;
        }

        html += '<fieldset data-role="controlgroup">';
        html += '<legend>Metadata Savers:</legend>';

        for (var i = 0, length = plugins.length; i < length; i++) {

            var plugin = plugins[i];

            var id = 'chkMetadataSaver' + i;

            var isChecked = config.DisabledMetadataSavers.indexOf(plugin.Name) == -1 ? ' checked="checked"' : '';

            html += '<input class="chkMetadataSaver" type="checkbox" name="' + id + '" id="' + id + '" data-mini="true"' + isChecked + ' data-pluginname="' + plugin.Name + '">';
            html += '<label for="' + id + '">' + plugin.Name + '</label>';
        }

        html += '</fieldset>';
        html += '<div class="fieldDescription">Choose the file formats to save your metadata to.</div>';

        $('.metadataSavers', page).html(html).show().trigger('create');
    }

    function renderMetadataFetchers(page, type, config, metadataInfo) {

        var plugins = metadataInfo.Plugins.filter(function (p) {
            return p.Type == 'MetadataFetcher';
        });

        var html = '';

        if (!plugins.length) {
            $('.metadataFetchers', page).html(html).hide().trigger('create');
            return;
        }

        html += '<fieldset data-role="controlgroup">';
        html += '<legend>Metadata Fetchers:</legend>';

        for (var i = 0, length = plugins.length; i < length; i++) {

            var plugin = plugins[i];

            var id = 'chkMetadataFetcher' + i;

            html += '<input type="checkbox" name="' + id + '" id="' + id + '" data-mini="true">';
            html += '<label for="' + id + '">' + plugin.Name + '</label>';
        }

        html += '</fieldset>';

        $('.metadataFetchers', page).html(html).show().trigger('create');
    }

    function renderMetadataLocals(page, type, config, metadataInfo) {

        var plugins = metadataInfo.Plugins.filter(function (p) {
            return p.Type == 'LocalMetadataProvider';
        });

        var html = '';

        if (!plugins.length) {
            $('.metadataReaders', page).html(html).hide().trigger('create');
            return;
        }

        html += '<div class="ui-controlgroup-label" style="margin-bottom:0;padding-left:2px;">Preferred Local Metadata:</div>';
        html += '<ul data-role="listview" data-inset="true" data-mini="true" style="margin-top:.5em;margin-bottom:.5em;">';

        for (var i = 0, length = plugins.length; i < length; i++) {

            var plugin = plugins[i];

            if (i > 0) {
                html += '<li data-mini="true" class="localReaderOption" data-pluginname="' + plugin.Name + '">';

                html += '<a href="#" style="font-size:13px;font-weight:normal;">' + plugin.Name + '</a>';

                html += '<a class="btnLocalReaderUp" data-pluginindex="' + i + '" href="#" style="font-size:13px;font-weight:normal;" data-icon="arrow-u">Up</a>';

                html += '</li>';
            }
            else if (plugins.length > 1) {
                html += '<li data-mini="true" class="localReaderOption" data-pluginname="' + plugin.Name + '">';

                html += '<a href="#" style="font-size:13px;font-weight:normal;">' + plugin.Name + '</a>';

                html += '<a class="btnLocalReaderDown" data-pluginindex="' + i + '" href="#" style="font-size:13px;font-weight:normal;" data-icon="arrow-d">Down</a>';

                html += '</li>';
            }
            else {
                html += '<li data-mini="true" class="localReaderOption" data-pluginname="' + plugin.Name + '">';

                html += plugin.Name;

                html += '</li>';
            }
        }

        html += '</ul>';
        html += '<div class="fieldDescription">Rank your preferred local metadata sources in order of priority. The first file found will be read.</div>';

        $('.metadataReaders', page).html(html).show().trigger('create');
    }

    function loadPage(page) {

        var type = getParameterByName('type');

        $('.categoryTab', page).removeClass('ui-btn-active');

        if (type == 'games') {

            loadTabs(page, [

                { name: 'Games', type: 'Game' },
                { name: 'Game Systems', type: 'GameSystem' },
                { name: 'Game Genres', type: 'GameGenre' }
            ]);

            $('.gamesTab', page).addClass('ui-btn-active');
        }
        else if (type == 'movies') {

            loadTabs(page, [

                { name: 'Movies', type: 'Movie' },
                { name: 'Collections', type: 'BoxSet' }
            ]);

            $('.moviesTab', page).addClass('ui-btn-active');
        }
        else if (type == 'tv') {

            loadTabs(page, [

                { name: 'Series', type: 'Series' },
                { name: 'Seasons', type: 'Season' },
                { name: 'Episodes', type: 'Episode' }
            ]);

            $('.tvTab', page).addClass('ui-btn-active');
        }
        else if (type == 'music') {

            loadTabs(page, [

                { name: 'Artists', type: 'MusicArtist' },
                { name: 'Albums', type: 'MusicAlbum' },
                { name: 'Songs', type: 'Audio' },
                { name: 'Music Videos', type: 'MusicVideo' },
                { name: 'Music Genres', type: 'MusicGenre' }
            ]);

            $('.musicTab', page).addClass('ui-btn-active');
        }
        else if (type == 'others') {

            loadTabs(page, [

                { name: 'People', type: 'Person' },
                { name: 'Genres', type: 'Genre' },
                { name: 'Studios', type: 'Studio' },
                { name: 'Books', type: 'Book' },
                { name: 'Home Videos', type: 'Video' },
                { name: 'Adult Videos', type: 'AdultVideo' }
            ]);

            $('.othersTab', page).addClass('ui-btn-active');
        }
    }

    function saveSettingsIntoConfig(form, config) {

        config.DisabledMetadataSavers = $('.chkMetadataSaver:not(:checked)', form).get().map(function (c) {

            return c.getAttribute('data-pluginname');

        });

        config.LocalMetadataReaders = $('.localReaderOption', form).get().map(function (c) {

            return c.getAttribute('data-pluginname');

        });

        config.ImageOptions = $('.imageType:visible input', form).get().map(function (c) {


            return {
                Type: $(c).parents('.imageType').attr('data-imagetype'),
                Limit: c.checked ? 1 : 0,
                MinWidth: 0
            };

        });

        if ($('.backdropFields:visible', form).length) {

            config.ImageOptions.push({
                Type: 'Backdrop',
                Limit: $('#txtMaxBackdrops', form).val(),
                MinWidth: $('#txtMinBackdropDownloadWidth', form).val()
            });
        } else {
            config.ImageOptions.push({
                Type: 'Backdrop',
                Limit: 0,
                MinWidth: 0
            });
        }

        if ($('.screenshotFields:visible', form).length) {

            config.ImageOptions.push({
                Type: 'Screenshot',
                Limit: $('#txtMaxScreenshots', form).val(),
                MinWidth: $('#txtMinScreenshotDownloadWidth', form).val()
            });
        } else {
            config.ImageOptions.push({
                Type: 'Screenshot',
                Limit: 0,
                MinWidth: 0
            });
        }
    }

    function onSubmit() {

        var form = this;

        Dashboard.showLoadingMsg();

        ApiClient.getServerConfiguration().done(function (config) {

            var type = currentType;

            var metadataOptions = config.MetadataOptions.filter(function (c) {
                return c.ItemType == type;
            })[0];

            if (metadataOptions) {

                saveSettingsIntoConfig(form, metadataOptions);
                ApiClient.updateServerConfiguration(config).done(Dashboard.processServerConfigurationUpdateResult);

            } else {

                $.getJSON(ApiClient.getUrl("System/Configuration/MetadataOptions/Default")).done(function (defaultOptions) {

                    defaultOptions.ItemType = type;
                    config.MetadataOptions.push(defaultOptions);
                    saveSettingsIntoConfig(form, defaultOptions);
                    ApiClient.updateServerConfiguration(config).done(Dashboard.processServerConfigurationUpdateResult);

                });
            }
        });

        // Disable default form submission
        return false;
    }

    $(document).on('pageshow', "#metadataImagesConfigurationPage", function () {

        Dashboard.showLoadingMsg();

        var page = this;

        loadPage(page);
    });

    window.MetadataImagesPage = {

        onSubmit: onSubmit
    };

})(jQuery, document, window);