﻿using MediaBrowser.Common.Net;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Serialization;
using System;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace MediaBrowser.Providers.Omdb
{
    public class OmdbProvider
    {
        private readonly SemaphoreSlim _resourcePool = new SemaphoreSlim(1, 1);
        private readonly IJsonSerializer _jsonSerializer;
        private readonly IHttpClient _httpClient;
        private readonly CultureInfo _usCulture = new CultureInfo("en-US");

        public OmdbProvider(IJsonSerializer jsonSerializer, IHttpClient httpClient)
        {
            _jsonSerializer = jsonSerializer;
            _httpClient = httpClient;
        }

        public async Task<ItemUpdateType> Fetch(BaseItem item, CancellationToken cancellationToken)
        {
            var imdbId = item.GetProviderId(MetadataProviders.Imdb);

            if (string.IsNullOrEmpty(imdbId))
            {
                return ItemUpdateType.None;
            }

            var imdbParam = imdbId.StartsWith("tt", StringComparison.OrdinalIgnoreCase) ? imdbId : "tt" + imdbId;

            var url = string.Format("http://www.omdbapi.com/?i={0}&tomatoes=true", imdbParam);

            using (var stream = await _httpClient.Get(new HttpRequestOptions
            {
                Url = url,
                ResourcePool = _resourcePool,
                CancellationToken = cancellationToken

            }).ConfigureAwait(false))
            {
                var result = _jsonSerializer.DeserializeFromStream<RootObject>(stream);

                var hasCriticRating = item as IHasCriticRating;
                if (hasCriticRating != null)
                {
                    // Seeing some bogus RT data on omdb for series, so filter it out here
                    // RT doesn't even have tv series
                    int tomatoMeter;

                    if (!string.IsNullOrEmpty(result.tomatoMeter)
                        && int.TryParse(result.tomatoMeter, NumberStyles.Integer, _usCulture, out tomatoMeter)
                        && tomatoMeter >= 0)
                    {
                        hasCriticRating.CriticRating = tomatoMeter;
                    }

                    if (!string.IsNullOrEmpty(result.tomatoConsensus)
                        && !string.Equals(result.tomatoConsensus, "n/a", StringComparison.OrdinalIgnoreCase)
                        && !string.Equals(result.tomatoConsensus, "No consensus yet.", StringComparison.OrdinalIgnoreCase))
                    {
                        hasCriticRating.CriticRatingSummary = WebUtility.HtmlDecode(result.tomatoConsensus);
                    }
                }

                int voteCount;

                if (!string.IsNullOrEmpty(result.imdbVotes)
                    && int.TryParse(result.imdbVotes, NumberStyles.Number, _usCulture, out voteCount)
                    && voteCount >= 0)
                {
                    item.VoteCount = voteCount;
                }

                float imdbRating;

                if (!string.IsNullOrEmpty(result.imdbRating)
                    && float.TryParse(result.imdbRating, NumberStyles.Any, _usCulture, out imdbRating)
                    && imdbRating >= 0)
                {
                    item.CommunityRating = imdbRating;
                }

                if (!string.IsNullOrEmpty(result.Website)
                        && !string.Equals(result.Website, "n/a", StringComparison.OrdinalIgnoreCase))
                {
                    item.HomePageUrl = result.Website;
                }

                ParseAdditionalMetadata(item, result);
            }

            return ItemUpdateType.MetadataDownload;
        }

        private void ParseAdditionalMetadata(BaseItem item, RootObject result)
        {
            // Grab series genres because imdb data is better than tvdb. Leave movies alone
            // But only do it if english is the preferred language because this data will not be localized
            if (!item.LockedFields.Contains(MetadataFields.Genres) &&
                ShouldFetchGenres(item) &&
                !string.IsNullOrWhiteSpace(result.Genre) &&
                !string.Equals(result.Genre, "n/a", StringComparison.OrdinalIgnoreCase))
            {
                item.Genres.Clear();

                foreach (var genre in result.Genre
                    .Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(i => i.Trim())
                    .Where(i => !string.IsNullOrWhiteSpace(i)))
                {
                    item.AddGenre(genre);
                }
            }

            var hasMetascore = item as IHasMetascore;
            if (hasMetascore != null)
            {
                float metascore;

                if (!string.IsNullOrEmpty(result.Metascore) && float.TryParse(result.Metascore, NumberStyles.Any, _usCulture, out metascore) && metascore >= 0)
                {
                    hasMetascore.Metascore = metascore;
                }
            }

            var hasAwards = item as IHasAwards;
            if (hasAwards != null && !string.IsNullOrEmpty(result.Awards) &&
                !string.Equals(result.Awards, "n/a", StringComparison.OrdinalIgnoreCase))
            {
                hasAwards.AwardSummary = WebUtility.HtmlDecode(result.Awards);
            }
        }

        private bool ShouldFetchGenres(BaseItem item)
        {
            var lang = item.GetPreferredMetadataLanguage();

            // The data isn't localized and so can only be used for english users
            if (!string.Equals(lang, "en", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            // Only fetch if other providers didn't get anything
            if (item is Trailer)
            {
                return item.Genres.Count == 0;
            }

            return item is Series || item is Movie;
        }

        protected class RootObject
        {
            public string Title { get; set; }
            public string Year { get; set; }
            public string Rated { get; set; }
            public string Released { get; set; }
            public string Runtime { get; set; }
            public string Genre { get; set; }
            public string Director { get; set; }
            public string Writer { get; set; }
            public string Actors { get; set; }
            public string Plot { get; set; }
            public string Poster { get; set; }
            public string imdbRating { get; set; }
            public string imdbVotes { get; set; }
            public string imdbID { get; set; }
            public string Type { get; set; }
            public string tomatoMeter { get; set; }
            public string tomatoImage { get; set; }
            public string tomatoRating { get; set; }
            public string tomatoReviews { get; set; }
            public string tomatoFresh { get; set; }
            public string tomatoRotten { get; set; }
            public string tomatoConsensus { get; set; }
            public string tomatoUserMeter { get; set; }
            public string tomatoUserRating { get; set; }
            public string tomatoUserReviews { get; set; }
            public string DVD { get; set; }
            public string BoxOffice { get; set; }
            public string Production { get; set; }
            public string Website { get; set; }
            public string Response { get; set; }

            public string Language { get; set; }
            public string Country { get; set; }
            public string Awards { get; set; }
            public string Metascore { get; set; }
        }

    }
}
