'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = crypto.randomUUID();

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
            months[this.date.getMonth()]
        } ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);

        this.cadence = cadence;

        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);

        this.elevationGain = elevationGain;

        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();

        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

        this._getLocalStorage();
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not get your position');
            });
        }
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, 17);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach((work) => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        this._toggleElevationField();
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);
    }

    _toggleElevationField() {
        if (inputType.value === 'running') {
            inputCadence.closest('.form__row').classList.remove('form__row--hidden');
            inputElevation.closest('.form__row').classList.add('form__row--hidden');
        }
        if (inputType.value === 'cycling') {
            inputCadence.closest('.form__row').classList.add('form__row--hidden');
            inputElevation.closest('.form__row').classList.remove('form__row--hidden');
        }
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every((inp) => Number.isFinite(inp));
        const isAllPositive = (...inputs) => inputs.every((inp) => inp > 0);

        e.preventDefault();

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;

        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        if (type === 'running') {
            const cadence = +inputCadence.value;

            if (
                !validInputs(distance, duration, cadence) ||
                !isAllPositive(distance, duration, cadence)
            ) {
                return alert('Inputs have to be positive numbers');
            }

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            if (!validInputs(distance, duration, elevation) || !isAllPositive(distance, duration)) {
                return alert('Inputs have to be positive numbers');
            }

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        this.#workouts.push(workout);
        this._renderWorkoutMarker(workout);
        this._renderWorkout(workout);
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${
                    workout.type[0].toUpperCase() + workout.type.slice(1)
                } on April 14</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;

        if (workout.type === 'running') {
            html += `
                    <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
                </li>
            `;
        }

        if (workout.type === 'cycling') {
            html += `
                    <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
                </li>
            `;
        }

        form.insertAdjacentHTML('afterend', html);
        this._hideForm();
    }

    _moveToPopup(e) {
        const workoutElement = e.target.closest('.workout');
        if (!workoutElement) return;

        const id = workoutElement.dataset.id;
        const workout = this.#workouts.find((elem) => elem.id === id);

        this.#map.setView(workout.coords, this.#map.getZoom(), {
            animate: true,
            duration: 0.25,
            easeLinearity: 0.5,
        });
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        data.forEach((workout) => this._restoreObject(workout));

        this.#workouts.forEach((work) => {
            this._renderWorkout(work);
        });
    }

    _restoreObject(workout) {
        if (workout.type === 'running') {
            this.#workouts.push(
                new Running(workout.coords, workout.distance, workout.duration, workout.cadence)
            );
        }
        if (workout.type === 'cycling') {
            this.#workouts.push(
                new Cycling(
                    workout.coords,
                    workout.distance,
                    workout.duration,
                    workout.elevationGain
                )
            );
        }
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();
